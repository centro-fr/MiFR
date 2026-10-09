import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  actualizarHorariosSchema,
  cambiarPlanSchema,
  crearInscripcionSchema,
  darDeBajaAlumnoSchema,
  inscripcionIdParamSchema,
  listarInscripcionesQuerySchema,
  reactivarAlumnoSchema,
} from "./inscripcion.schemas.js";

const estadoInscripcionSchema = z.enum(["PREINSCRIPTA", "ACTIVA", "BAJA"]);
const horarioSchema = z.object({
  id_horario: z.number().int(),
  id_actividad: z.number().int(),
  id_profesora: z.number().int(),
  dia_semana: z.number().int(),
  hora_inicio: fechaSchema,
  hora_fin: fechaSchema,
  cupo_maximo: z.number().int().nullable(),
  fecha_alta: fechaSchema,
  fecha_baja: fechaSchema.nullable(),
  actividad: z.object({
    id_actividad: z.number().int(),
    codigo: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
    cupo_maximo: z.number().int().nullable(),
    activo: z.boolean(),
  }),
  profesora: z.object({
    id_profesora: z.number().int(),
    usuario: z.object({ nombre: z.string(), apellido: z.string() }),
  }),
});

const inscripcionSchema = z
  .object({
    id_inscripcion: z.number().int(),
    id_alumno: z.number().int(),
    id_plan: z.number().int(),
    id_plan_precio: z.number().int(),
    id_profesora: z.number().int(),
    id_promocion: z.number().int().nullable(),
    sin_cargo: z.boolean(),
    fecha_inicio: fechaSchema,
    fecha_fin_estimado: fechaSchema.nullable(),
    estado: estadoInscripcionSchema,
    motivo_baja: z.enum(["ABANDONO", "MUDANZA", "SALUD", "ECONOMICO", "CAMBIO_PLAN", "OTRO"]).nullable(),
    observaciones: z.string().nullable(),
    fecha_alta: fechaSchema,
    fecha_baja: fechaSchema.nullable(),
    alumno: z.object({
      id_alumno: z.number().int(),
      estado: z.enum(["ACTIVO", "INACTIVO", "BAJA"]),
      usuario: z.object({ nombre: z.string(), apellido: z.string() }),
    }),
    plan: z.object({
      id_plan: z.number().int(),
      tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
      nombre: z.string(),
      descripcion: z.string().nullable(),
      clases_por_semana: z.number().int().nullable(),
      dias_gracia: z.number().int(),
      id_actividad_exclusiva: z.number().int().nullable(),
      profesora_unica: z.boolean(),
      fecha_alta: fechaSchema,
      fecha_baja: fechaSchema.nullable(),
    }),
    plan_precio: z.object({
      id_plan_precio: z.number().int(),
      id_plan: z.number().int(),
      precio: z.union([z.number(), z.string()]),
      fecha_vigencia_desde: fechaSchema,
      fecha_vigencia_hasta: fechaSchema.nullable(),
    }),
    profesora: z.object({
      id_profesora: z.number().int(),
      usuario: z.object({ nombre: z.string(), apellido: z.string() }),
    }),
    horarios: z.array(
      z.object({
        id_inscripcion: z.number().int(),
        id_horario: z.number().int(),
        fecha_desde: fechaSchema,
        fecha_hasta: fechaSchema.nullable(),
        horario: horarioSchema,
      }),
    ),
  })
  .openapi("Inscripcion");

const respuestas = respuestaJson("Inscripcion", inscripcionSchema);
const propietariaEditar = "Requiere sesión, rol PROPIETARIA y permiso `ALUMNOS_EDITAR`.";
const reglasDeAlta =
  "El plan debe estar vigente y tener precio vigente; los horarios deben estar activos, ser de la misma profesora, " +
  "respetar la actividad exclusiva y no superar el cupo disponible.";

export function registrarDocumentacionInscripciones(registro: OpenAPIRegistry): void {
  const tags = ["Inscripciones"];
  const security = SEGURIDAD_BEARER;

  registro.registerPath({
    method: "get",
    path: "/inscripciones",
    tags,
    security,
    summary: "Listar inscripciones",
    description:
      "Requiere el permiso `ALUMNOS_VER`. Admite filtros por alumno, plan, profesora, actividad y estado.",
    request: { query: listarInscripcionesQuerySchema },
    responses: {
      200: respuestaJson("Inscripciones", z.array(inscripcionSchema)),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/inscripciones",
    tags,
    security,
    summary: "Crear una pre-inscripción",
    description: `Requiere el permiso \`ALUMNOS_EDITAR\`. ${reglasDeAlta}`,
    request: {
      body: cuerpoJson(
        crearInscripcionSchema.openapi("CrearInscripcion", {
          example: {
            id_alumno: 1,
            id_plan: 1,
            id_profesora: 1,
            ids_horarios: [1, 2],
          },
        }),
      ),
    },
    responses: { 201: respuestas, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "get",
    path: "/inscripciones/{id}",
    tags,
    security,
    summary: "Obtener una inscripción",
    description: "Requiere el permiso `ALUMNOS_VER`.",
    request: { params: inscripcionIdParamSchema },
    responses: { 200: respuestas, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "post",
    path: "/inscripciones/{id}/activar",
    tags,
    security,
    summary: "Activar una pre-inscripción",
    description: `${propietariaEditar} La activación vuelve a verificar el cupo y es idempotente.`,
    request: { params: inscripcionIdParamSchema },
    responses: { 200: respuestas, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "post",
    path: "/alumnos/{id}/baja",
    tags,
    security,
    summary: "Dar de baja al alumno",
    description: `${propietariaEditar} La baja es lógica: conserva la inscripción y cierra sus horarios vigentes.`,
    request: {
      params: inscripcionIdParamSchema,
      body: cuerpoJson(darDeBajaAlumnoSchema),
    },
    responses: {
      200: respuestaJson("Alumno dado de baja", z.object({ mensaje: z.string() })),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/alumnos/{id}/reactivar",
    tags,
    security,
    summary: "Reactivar un alumno",
    description: `${propietariaEditar} Crea una inscripción nueva y valida nuevamente el cupo. ${reglasDeAlta}`,
    request: {
      params: inscripcionIdParamSchema,
      body: cuerpoJson(reactivarAlumnoSchema),
    },
    responses: { 201: respuestas, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "post",
    path: "/inscripciones/{id}/cambio-plan",
    tags,
    security,
    summary: "Cambiar el plan de una inscripción",
    description: `${propietariaEditar} La operación es transaccional; conserva los cobros que apuntan a la inscripción anterior. ${reglasDeAlta}`,
    request: {
      params: inscripcionIdParamSchema,
      body: cuerpoJson(cambiarPlanSchema),
    },
    responses: { 200: respuestas, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "patch",
    path: "/inscripciones/{id}/horarios",
    tags,
    security,
    summary: "Modificar los horarios de una inscripción",
    description: `${propietariaEditar} Cierra los horarios que salen y valida el cupo de los nuevos.`,
    request: {
      params: inscripcionIdParamSchema,
      body: cuerpoJson(actualizarHorariosSchema),
    },
    responses: { 200: respuestas, ...respuestasDeError(400, 401, 403, 404, 409) },
  });
}
