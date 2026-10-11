import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import type { EstadoInscripcionMock } from "@/mocks/data/inscripciones";
import { errorApi, usuarioDeLaSesion, verificarAcceso } from "@/mocks/handlers/respuestas";
import { inscripcionConDatos } from "@/mocks/handlers/serializar";

// Mock de GET /inscripciones (inscripcion.routes.ts): filtros por alumno y estado, y paginado
// con limit (por defecto y como máximo 100) y offset.

const ESTADOS: EstadoInscripcionMock[] = ["PREINSCRIPTA", "ACTIVA", "BAJA"];
const LIMITE_MAXIMO = 100;

function numeroDeQuery(valor: string | null, porDefecto: number): number | null {
  if (valor === null) return porDefecto;
  return /^\d{1,3}$/.test(valor) ? Number(valor) : null;
}

// Una profesora solo ve las inscripciones a su cargo; la propietaria, todas.
function idProfesoraDeLaSesion(request: Request): number | null {
  const usuario = usuarioDeLaSesion(request);
  if (!usuario || usuario.roles.includes("PROPIETARIA")) return null;
  return db.profesoras.find((p) => p.id_usuario === usuario.id_usuario)?.id_profesora ?? -1;
}

export const inscripcionesHandlers = [
  http.get("*/api/v1/inscripciones", async ({ request }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const query = new URL(request.url).searchParams;
    const estado = query.get("estado");
    const idAlumno = query.get("id_alumno");
    const limit = numeroDeQuery(query.get("limit"), LIMITE_MAXIMO);
    const offset = numeroDeQuery(query.get("offset"), 0);
    if ((estado && !ESTADOS.includes(estado as EstadoInscripcionMock)) || !limit || limit > LIMITE_MAXIMO || offset === null) {
      return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    }

    const idProfesora = idProfesoraDeLaSesion(request);
    const inscripciones = db.inscripciones
      .filter((i) => !estado || i.estado === estado)
      .filter((i) => !idAlumno || i.id_alumno === Number(idAlumno))
      .filter((i) => idProfesora === null || i.id_profesora === idProfesora)
      .slice(offset, offset + limit);
    return HttpResponse.json(inscripciones.map(inscripcionConDatos));
  }),
];
