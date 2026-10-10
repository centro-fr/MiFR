import { http, HttpResponse, delay } from "msw";
import { bajaAlumnoBodySchema, type FichaAlumnoApi } from "@/features/alumnos/schemas/alumno";
import { db } from "@/mocks/db";
import type { AlumnoMock } from "@/mocks/data/alumnos";
import { errorApi, idDeRuta, idInvalido, verificarAcceso } from "@/mocks/handlers/respuestas";

// Mock de GET /alumnos/:id (alumno.routes.ts) y POST /alumnos/:id/baja (inscripcion.routes.ts).
// El mock no guarda inscripciones: la ficha sale con `inscripciones` vacío y la baja no tiene
// horarios que cerrar. Por eso tampoco replica el 403 a la profesora sin el alumno a cargo.

function datosPersonales(idUsuario: number) {
  return db.usuariosPersonas.find((u) => u.id_usuario === idUsuario)!;
}

function fichaDe(alumno: AlumnoMock): FichaAlumnoApi & { inscripciones: [] } {
  return {
    ...alumno,
    usuario: datosPersonales(alumno.id_usuario),
    responsable: alumno.id_usuario_responsable === null ? null : datosPersonales(alumno.id_usuario_responsable),
    inscripciones: [],
  };
}

function buscarAlumno(id: number) {
  return db.alumnos.find((a) => a.id_alumno === id);
}

export const alumnosHandlers = [
  http.get("*/api/v1/alumnos/:id", async ({ request, params }) => {
    await delay(300);
    const denegado = verificarAcceso(request, { permiso: "ALUMNOS_VER" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    return HttpResponse.json(fichaDe(alumno));
  }),

  // Baja lógica (US-08): solo la propietaria. No borra nada: cambia el estado y registra la fecha.
  http.post("*/api/v1/alumnos/:id/baja", async ({ request, params }) => {
    await delay(500);
    const denegado = verificarAcceso(request, { rol: "PROPIETARIA", permiso: "ALUMNOS_EDITAR" });
    if (denegado) return denegado;

    const id = idDeRuta(params.id);
    if (id === null) return idInvalido();
    const cuerpo = bajaAlumnoBodySchema.safeParse(await request.json().catch(() => null));
    if (!cuerpo.success) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");

    const alumno = buscarAlumno(id);
    if (!alumno) return errorApi(404, "NOT_FOUND", "Alumno no encontrado");
    if (alumno.estado === "BAJA") return errorApi(409, "CONFLICT", "El alumno ya está dado de baja");

    Object.assign(alumno, { estado: "BAJA", fecha_baja: new Date().toISOString() });
    return HttpResponse.json({ mensaje: "Alumno dado de baja" });
  }),
];
