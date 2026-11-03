import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import { errorApi, verificarAcceso } from "@/mocks/handlers/respuestas";

const CATALOGO = [
  { codigo: "RACHA_10", nombre: "Racha de 10 clases", descripcion: "Asistir a 10 clases seguidas sin faltar", tipo: "RACHA", valor_umbral: 10 },
  { codigo: "RACHA_25", nombre: "Racha de 25 clases", descripcion: "Asistir a 25 clases seguidas sin faltar", tipo: "RACHA", valor_umbral: 25 },
  { codigo: "TOTAL_50", nombre: "50 clases", descripcion: "Llegar a 50 clases asistidas", tipo: "TOTAL_CLASES", valor_umbral: 50 },
  { codigo: "TOTAL_100", nombre: "100 clases", descripcion: "Llegar a 100 clases asistidas", tipo: "TOTAL_CLASES", valor_umbral: 100 },
  { codigo: "MES_PERFECTO", nombre: "Mes perfecto", descripcion: "Asistir a todas las clases dictadas del mes", tipo: "MES_PERFECTO", valor_umbral: 100 },
  { codigo: "PODIO_MES", nombre: "Podio del mes", descripcion: "Terminar entre los tres primeros del ranking mensual", tipo: "PODIO_MES", valor_umbral: 3 },
] as const;

const PROGRESOS: Record<number, { actual: number; mejor: number; inicio: string | null }> = {
  1: { actual: 0, mejor: 0, inicio: null },
  2: { actual: 4, mejor: 7, inicio: "2026-10-12" },
  3: { actual: 12, mejor: 12, inicio: "2026-10-01" },
  4: { actual: 8, mejor: 10, inicio: "2026-10-20" },
  11: { actual: 5, mejor: 5, inicio: "2026-10-24" },
  12: { actual: 3, mejor: 9, inicio: "2026-10-27" },
  13: { actual: 0, mejor: 6, inicio: null },
  14: { actual: 2, mejor: 2, inicio: "2026-10-29" },
};

function alumnoPropio(idUsuario: number | null): number | null {
  const usuario = db.usuarios.find((item) => item.id_usuario === idUsuario);
  if (!usuario) return null;
  const persona = db.usuariosPersonas.find((item) => item.email === usuario.email);
  const ids = [usuario.id_usuario, ...(persona ? [persona.id_usuario] : [])];
  return db.alumnos.find((alumno) =>
    ids.includes(alumno.id_usuario) ||
    (alumno.id_usuario_responsable !== null && ids.includes(alumno.id_usuario_responsable)),
  )?.id_alumno ?? null;
}

function fichaDe(idAlumno: number) {
  const progreso = PROGRESOS[idAlumno] ?? PROGRESOS[1];
  const clasesAsistidas = idAlumno === 3 ? 50 : idAlumno === 4 ? 18 : idAlumno === 11 ? 7 : progreso.actual;
  return {
    id_alumno: idAlumno,
    racha: {
      actual: progreso.actual,
      mejor: progreso.mejor,
      fecha_inicio: progreso.inicio,
      proximo_hito: progreso.actual < 10
        ? { umbral: 10, faltantes: 10 - progreso.actual }
        : progreso.actual < 25
          ? { umbral: 25, faltantes: 25 - progreso.actual }
          : null,
    },
    clases_asistidas: clasesAsistidas,
    proximo_hito_clases: clasesAsistidas < 50
      ? { umbral: 50, faltantes: 50 - clasesAsistidas }
      : clasesAsistidas < 100
        ? { umbral: 100, faltantes: 100 - clasesAsistidas }
        : null,
    insignias: CATALOGO.map((insignia) => {
      const obtenida = (insignia.codigo === "RACHA_10" && progreso.mejor >= 10) ||
        (insignia.codigo === "TOTAL_50" && clasesAsistidas >= 50) ||
        (insignia.codigo === "MES_PERFECTO" && idAlumno === 3) ||
        (insignia.codigo === "PODIO_MES" && idAlumno === 3);
      const actual = insignia.tipo === "RACHA" ? progreso.mejor : insignia.tipo === "TOTAL_CLASES" ? clasesAsistidas : 0;
      return {
        ...insignia,
        obtenida,
        fecha_obtencion: obtenida ? "2026-10-31" : null,
        periodos: insignia.tipo === "MES_PERFECTO" && obtenida ? ["2026-10"] : insignia.tipo === "PODIO_MES" && obtenida ? ["2026-10"] : [],
        progreso: obtenida || insignia.tipo === "MES_PERFECTO" || insignia.tipo === "PODIO_MES"
          ? null
          : { actual, umbral: insignia.valor_umbral },
      };
    }),
  };
}

export const insigniasHandlers = [
  http.get("*/api/v1/alumnos/:id/insignias", async ({ request, params }) => {
    await delay(250);
    const denegado = verificarAcceso(request, { permiso: "INSIGNIAS_VER_PROPIAS" });
    if (denegado) return denegado;
    const idAlumno = Number(params.id);
    const alumno = db.alumnos.find((item) => item.id_alumno === idAlumno);
    const propio = alumnoPropio(db.idUsuarioSesion);
    const usuario = db.usuarios.find((item) => item.id_usuario === db.idUsuarioSesion);
    const esPropietaria = usuario?.roles.includes("PROPIETARIA") ?? false;
    const esPropio = propio === idAlumno;
    if (!alumno || (!esPropietaria && !esPropio)) return errorApi(403, "FORBIDDEN", "Solo podés ver tus insignias o las de un menor a tu cargo");
    if (alumno.estado === "BAJA") return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    return HttpResponse.json(fichaDe(idAlumno));
  }),
];
