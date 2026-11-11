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
};

function alumnoPropioDeSesion(): number | null {
  const usuario = db.usuarios.find((item) => item.id_usuario === db.idUsuarioSesion);
  if (!usuario) return null;
  const persona = db.usuariosPersonas.find((item) => item.email === usuario.email);
  const ids = [usuario.id_usuario, ...(persona ? [persona.id_usuario] : [])];
  return (
    db.alumnos.find(
      (alumno) =>
        ids.includes(alumno.id_usuario) ||
        (alumno.id_usuario_responsable !== null && ids.includes(alumno.id_usuario_responsable)),
    )?.id_alumno ?? null
  );
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

    const propio = alumnoPropioDeSesion();
    const filas = Object.entries(ESTADISTICAS_DEMO)
      .filter(([id]) => db.alumnos.some((alumno) => alumno.id_alumno === Number(id) && alumno.estado === "ACTIVO"))
      .map(([id, datos]) => {
        const persona = personaPublica(Number(id));
        return {
        id_alumno: Number(id),
        nombre: persona.nombre,
        apellido: persona.apellido,
        porcentaje_asistencia: Number(((datos.asistidas / datos.previstas) * 100).toFixed(2)),
        clases_previstas: datos.previstas,
        clases_asistidas: datos.asistidas,
        racha_actual: datos.racha,
        insignias: insigniasObtenidasDe(Number(id)),
        es_propia: Number(id) === propio,
        };
      })
      .sort((a, b) => b.porcentaje_asistencia - a.porcentaje_asistencia || b.clases_asistidas - a.clases_asistidas || `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"))
      .map((fila, index) => ({ ...fila, posicion: index + 1 }));

    return HttpResponse.json({
      periodo: { desde: "2026-11-01", hasta: "2026-11-30" },
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
