import { http, HttpResponse } from "msw";
import { errorApi, idDeRuta, verificarAcceso } from "@/mocks/handlers/respuestas";
import type {
  AlumnoInactivo,
  EstadoGestionInactividad,
  PaginaAlumnosInactivos,
  SeguimientoInactividad,
} from "@/features/inactivos/schemas/inactivos";

export const MOCK_ALUMNOS_INACTIVOS_INICIALES: AlumnoInactivo[] = [
  {
    id_inscripcion: 3,
    alumno: {
      id_alumno: 3,
      nombre: "Valentina",
      apellido: "Herrera",
      dni: "39222333",
      telefono: "+5491144445555",
      email: "valentina.herrera@example.com",
    },
    tutor: null,
    profesora: {
      id_profesora: 1,
      nombre: "Lucía",
      apellido: "Gómez",
    },
    plan: {
      id_plan: 2,
      nombre: "Plan Intermedio",
    },
    estado_cuota: "AL_DIA",
    inasistencias_consecutivas: 3,
    fecha_ultima_asistencia: "2026-10-02T18:00:00.000Z",
    gestion: {
      estado: "PENDIENTE",
      fecha_registro: null,
    },
  },
  {
    id_inscripcion: 13,
    alumno: {
      id_alumno: 13,
      nombre: "Martín",
      apellido: "Morales",
      dni: "38789012",
      telefono: "+5491155556666",
      email: "martin.morales@example.com",
    },
    tutor: null,
    profesora: {
      id_profesora: 3,
      nombre: "Carla",
      apellido: "Ruiz",
    },
    plan: {
      id_plan: 2,
      nombre: "Plan Intermedio",
    },
    estado_cuota: "AL_DIA",
    inasistencias_consecutivas: 4,
    fecha_ultima_asistencia: "2026-09-25T19:00:00.000Z",
    gestion: {
      estado: "CONTACTADO",
      fecha_registro: "2026-10-20T14:30:00.000Z",
    },
  },
  {
    id_inscripcion: 4,
    alumno: {
      id_alumno: 4,
      nombre: "Camila",
      apellido: "Pérez",
      dni: "35123456",
      telefono: "+5491166667777",
      email: "camila.perez@example.com",
    },
    tutor: null,
    profesora: {
      id_profesora: 1,
      nombre: "Lucía",
      apellido: "Gómez",
    },
    plan: {
      id_plan: 1,
      nombre: "Plan Básico",
    },
    estado_cuota: "AL_DIA",
    inasistencias_consecutivas: 3,
    fecha_ultima_asistencia: "2026-10-05T10:00:00.000Z",
    gestion: {
      estado: "PENDIENTE",
      fecha_registro: null,
    },
  },
  {
    id_inscripcion: 26,
    alumno: {
      id_alumno: 26,
      nombre: "Mateo",
      apellido: "Fernández",
      dni: "52444555",
      telefono: null,
      email: null,
    },
    tutor: {
      nombre: "Carlos",
      apellido: "Fernández",
      telefono: "+5491133334444",
      email: "carlos.fernandez@example.com",
    },
    profesora: {
      id_profesora: 2,
      nombre: "Marina",
      apellido: "Sosa",
    },
    plan: {
      id_plan: 3,
      nombre: "Plan 5 días",
    },
    estado_cuota: "AL_DIA",
    inasistencias_consecutivas: 5,
    fecha_ultima_asistencia: "2026-09-18T16:00:00.000Z",
    gestion: {
      estado: "PENDIENTE",
      fecha_registro: null,
    },
  },
  {
    id_inscripcion: 27,
    alumno: {
      id_alumno: 27,
      nombre: "Lucas",
      apellido: "Benítez",
      dni: "39777888",
      telefono: "+5491177778888",
      email: "lucas.benitez@example.com",
    },
    tutor: null,
    profesora: {
      id_profesora: 1,
      nombre: "Lucía",
      apellido: "Gómez",
    },
    plan: {
      id_plan: 2,
      nombre: "Plan Intermedio",
    },
    estado_cuota: "AL_DIA",
    inasistencias_consecutivas: 3,
    fecha_ultima_asistencia: "2026-09-28T17:00:00.000Z",
    gestion: {
      estado: "IGNORADO",
      fecha_registro: "2026-10-10T09:00:00.000Z",
    },
  },
];

let alumnosInactivosStore: AlumnoInactivo[] = JSON.parse(
  JSON.stringify(MOCK_ALUMNOS_INACTIVOS_INICIALES)
);

export function reiniciarMockInactivos(): void {
  alumnosInactivosStore = JSON.parse(JSON.stringify(MOCK_ALUMNOS_INACTIVOS_INICIALES));
}

export const inactivosHandlers = [
  // GET /api/v1/informes/alumnos-inactivos
  http.get("/api/v1/informes/alumnos-inactivos", ({ request }) => {
    const errorAcceso = verificarAcceso(request, {
      rol: "PROPIETARIA",
      permiso: "REPORTES_COBRANZA_VER",
    });
    if (errorAcceso) return errorAcceso;

    const url = new URL(request.url);
    const idProfesora = url.searchParams.get("id_profesora");
    const idPlan = url.searchParams.get("id_plan");
    const minimoInasistencias = url.searchParams.get("minimo_inasistencias");
    const estadoGestion = url.searchParams.get("estado_gestion") as
      | EstadoGestionInactividad
      | null;
    const incluirIgnorados = url.searchParams.get("incluir_ignorados") === "true";
    const limit = Number(url.searchParams.get("limit") || 50);
    const offset = Number(url.searchParams.get("offset") || 0);

    let filtrados = [...alumnosInactivosStore];

    if (estadoGestion) {
      filtrados = filtrados.filter((a) => a.gestion.estado === estadoGestion);
    } else if (!incluirIgnorados) {
      // Regla de backend: si no se especifica estado_gestion ni incluir_ignorados, los IGNORADO quedan ocultos
      filtrados = filtrados.filter((a) => a.gestion.estado !== "IGNORADO");
    }

    if (idProfesora) {
      filtrados = filtrados.filter((a) => a.profesora.id_profesora === Number(idProfesora));
    }

    if (idPlan) {
      filtrados = filtrados.filter((a) => a.plan.id_plan === Number(idPlan));
    }

    if (minimoInasistencias) {
      const min = Number(minimoInasistencias);
      filtrados = filtrados.filter((a) => a.inasistencias_consecutivas >= min);
    }

    // Ordenamiento: más inasistencias primero
    filtrados.sort((a, b) => b.inasistencias_consecutivas - a.inasistencias_consecutivas);

    const datos = filtrados.slice(offset, offset + limit);

    const respuesta: PaginaAlumnosInactivos = {
      datos,
      total: filtrados.length,
      umbral: 3,
      limit,
      offset,
    };

    return HttpResponse.json(respuesta);
  }),

  // PUT /api/v1/informes/alumnos-inactivos/:idInscripcion/seguimiento
  http.put("/api/v1/informes/alumnos-inactivos/:idInscripcion/seguimiento", async ({ request, params }) => {
    const errorAcceso = verificarAcceso(request, {
      rol: "PROPIETARIA",
      permiso: "REPORTES_COBRANZA_VER",
    });
    if (errorAcceso) return errorAcceso;

    const idInscripcion = idDeRuta(params.idInscripcion);
    if (!idInscripcion) return errorApi(400, "VALIDATION_ERROR", "ID de inscripción inválido");

    const cuerpo = (await request.json()) as { estado?: "CONTACTADO" | "GESTIONADO" | "IGNORADO" };
    if (!cuerpo.estado || !["CONTACTADO", "GESTIONADO", "IGNORADO"].includes(cuerpo.estado)) {
      return errorApi(400, "VALIDATION_ERROR", "Estado de gestión inválido");
    }

    const index = alumnosInactivosStore.findIndex((a) => a.id_inscripcion === idInscripcion);
    if (index === -1) {
      return errorApi(404, "NOT_FOUND", "Inscripción no encontrada");
    }

    const fecha_registro = new Date().toISOString();
    alumnosInactivosStore[index] = {
      ...alumnosInactivosStore[index],
      gestion: {
        estado: cuerpo.estado,
        fecha_registro,
      },
    };

    const respuesta: SeguimientoInactividad = {
      id_inscripcion: idInscripcion,
      estado: cuerpo.estado,
      fecha_registro,
      id_usuario_registra: 1,
    };

    return HttpResponse.json(respuesta);
  }),

  // DELETE /api/v1/informes/alumnos-inactivos/:idInscripcion/seguimiento
  http.delete("/api/v1/informes/alumnos-inactivos/:idInscripcion/seguimiento", ({ request, params }) => {
    const errorAcceso = verificarAcceso(request, {
      rol: "PROPIETARIA",
      permiso: "REPORTES_COBRANZA_VER",
    });
    if (errorAcceso) return errorAcceso;

    const idInscripcion = idDeRuta(params.idInscripcion);
    if (!idInscripcion) return errorApi(400, "VALIDATION_ERROR", "ID de inscripción inválido");

    const index = alumnosInactivosStore.findIndex((a) => a.id_inscripcion === idInscripcion);
    if (index === -1 || alumnosInactivosStore[index].gestion.estado === "PENDIENTE") {
      return errorApi(404, "NOT_FOUND", "La inscripción no tiene una marca de seguimiento");
    }

    alumnosInactivosStore[index] = {
      ...alumnosInactivosStore[index],
      gestion: {
        estado: "PENDIENTE",
        fecha_registro: null,
      },
    };

    return new HttpResponse(null, { status: 204 });
  }),
];
