import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import { insigniasObtenidasDe } from "@/mocks/handlers/insignias";
import { errorApi, usuarioDeLaSesion } from "@/mocks/handlers/respuestas";

const ESTADISTICAS_DEMO: Record<number, { previstas: number; asistidas: number; racha: number }> = {
  3: { previstas: 12, asistidas: 12, racha: 8 },
  4: { previstas: 10, asistidas: 9, racha: 4 },
  11: { previstas: 8, asistidas: 7, racha: 3 },
  12: { previstas: 8, asistidas: 6, racha: 2 },
  13: { previstas: 6, asistidas: 4, racha: 1 },
  14: { previstas: 4, asistidas: 2, racha: 0 },
  27: { previstas: 12, asistidas: 12, racha: 26 },
  28: { previstas: 8, asistidas: 7, racha: 5 },
};

/** El alumno de la sesión o, para un tutor, todos sus menores a cargo. */
function alumnosDeLaSesion(): number[] {
  const usuario = db.usuarios.find((item) => item.id_usuario === db.idUsuarioSesion);
  if (!usuario) return [];
  const persona = db.usuariosPersonas.find((item) => item.email === usuario.email);
  const ids = [usuario.id_usuario, ...(persona ? [persona.id_usuario] : [])];
  return db.alumnos
    .filter(
      (alumno) =>
        ids.includes(alumno.id_usuario) ||
        (alumno.id_usuario_responsable !== null && ids.includes(alumno.id_usuario_responsable)),
    )
    .map((alumno) => alumno.id_alumno);
}

function personaPublica(idAlumno: number) {
  const alumno = db.alumnos.find((item) => item.id_alumno === idAlumno);
  const persona = alumno && db.usuariosPersonas.find((item) => item.id_usuario === alumno.id_usuario);
  return persona ?? { nombre: "Alumno", apellido: "" };
}

export const rankingAsistenciaHandlers = [
  http.get("*/api/v1/reportes/ranking-asistencia", async ({ request }) => {
    await delay(300);
    const usuario = usuarioDeLaSesion(request);
    if (!usuario) return errorApi(401, "UNAUTHORIZED", "Sesión no válida");

    const propios = alumnosDeLaSesion();
    const url = new URL(request.url);
    const desdeQuery = url.searchParams.get("desde");
    const hastaQuery = url.searchParams.get("hasta");
    const periodo = {
      desde: desdeQuery ?? "2026-11-01",
      hasta: hastaQuery ?? "2026-11-30",
    };

    // Para que las cards y datos varíen dinámicamente según el mes/año/general seleccionado:
    // Si no se pasaron filtros o es el mes por defecto de test (noviembre 2026 completo), mantenemos ESTADISTICAS_DEMO
    const esDefaultDemo = !desdeQuery && !hastaQuery;
    const seed = (periodo.desde + periodo.hasta).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const esGeneral = periodo.desde <= "2000-01-01";
    const esAnual = !esGeneral && periodo.desde.endsWith("01-01");
    const filas = Object.entries(ESTADISTICAS_DEMO)
      .filter(([id]) => db.alumnos.some((alumno) => alumno.id_alumno === Number(id) && alumno.estado === "ACTIVO"))
      .map(([id, datos]) => {
        const idNum = Number(id);
        const persona = personaPublica(idNum);

        // Variación según el período seleccionado
        let previstas = datos.previstas;
        let asistidas = datos.asistidas;
        let racha = datos.racha;

        if (esDefaultDemo) {
          // Mantiene exactamente los datos semilla para los tests unitarios
        } else if (esGeneral) {
          previstas = datos.previstas * 12 + (idNum % 7) * 4;
          asistidas = Math.min(previstas, Math.floor(previstas * (0.85 + ((idNum + seed) % 15) / 100)));
          racha = Math.max(datos.racha, (idNum * 3) % 25 + 5);
        } else if (esAnual) {
          previstas = datos.previstas * 8 + (idNum % 5) * 2;
          asistidas = Math.min(previstas, Math.floor(previstas * (0.8 + ((idNum + seed) % 20) / 100)));
          racha = Math.max(1, (datos.racha + (idNum % 4)) % 15);
        } else {
          // Mensual pasado: ajustamos según el mes específico (usando seed)
          const offsetMes = (idNum + seed) % 4;
          previstas = Math.max(4, datos.previstas - offsetMes);
          const faltas = ((idNum * 3 + seed) % 3);
          asistidas = Math.max(1, Math.min(previstas, previstas - faltas));
          racha = (datos.racha + seed) % 12;
        }

        const porcentaje = Number(((asistidas / previstas) * 100).toFixed(2));

        return {
          id_alumno: idNum,
          nombre: persona.nombre,
          apellido: persona.apellido,
          porcentaje_asistencia: porcentaje,
          clases_previstas: previstas,
          clases_asistidas: asistidas,
          racha_actual: racha,
          insignias: insigniasObtenidasDe(idNum),
          es_propia: propios.includes(idNum),
        };
      })
      .sort((a, b) => b.porcentaje_asistencia - a.porcentaje_asistencia || b.clases_asistidas - a.clases_asistidas || `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"))
      .map((fila, index) => ({ ...fila, posicion: index + 1 }));

    return HttpResponse.json({
      periodo,
      actividad: null,
      minimo_clases: 4,
      datos: filas,
      propias: filas.filter((fila) => fila.es_propia),
      total: filas.length,
      limit: 50,
      offset: 0,
    });
  }),
];
