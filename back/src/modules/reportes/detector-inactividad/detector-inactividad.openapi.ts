import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  listarAlumnosInactivosQuerySchema,
  registrarSeguimientoSchema,
  seguimientoParamSchema,
} from "./detector-inactividad.schemas.js";

const contacto = {
  nombre: z.string(),
  apellido: z.string(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
};

const alumnoInactivoSchema = z
  .object({
    id_inscripcion: z.number().int(),
    alumno: z.object({ id_alumno: z.number().int(), ...contacto }),
    tutor: z.object(contacto).nullable().openapi({ description: "El contacto de un menor" }),
    profesora: z.object({ id_profesora: z.number().int(), nombre: z.string(), apellido: z.string() }),
    plan: z.object({ id_plan: z.number().int(), nombre: z.string() }),
    estado_cuota: z
      .enum(["AL_DIA", "POR_VENCER"])
      .openapi({ description: "POR_VENCER: en los días de gracia" }),
    inasistencias_consecutivas: z.number().int(),
    fecha_ultima_asistencia: fechaSchema.nullable().openapi({ description: "null si nunca asistió" }),
    gestion: z.object({
      estado: z.enum(["PENDIENTE", "CONTACTADO", "GESTIONADO", "IGNORADO"]),
      fecha_registro: fechaSchema.nullable(),
    }),
  })
  .openapi("AlumnoInactivo");

const paginaAlumnosInactivosSchema = z
  .object({
    datos: z.array(alumnoInactivoSchema),
    total: z.number().int(),
    umbral: z
      .number()
      .int()
      .openapi({ description: "INASISTENCIAS_CONSECUTIVAS_INACTIVO con el que se calculó" }),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("PaginaAlumnosInactivos");

const seguimientoSchema = z
  .object({
    id_inscripcion: z.number().int(),
    estado: z.enum(["CONTACTADO", "GESTIONADO", "IGNORADO"]),
    fecha_registro: fechaSchema,
    id_usuario_registra: z.number().int(),
  })
  .openapi("SeguimientoInactividad");

export function registrarDocumentacionDetectorInactividad(registro: OpenAPIRegistry): void {
  const tags = ["Informes"];
  const security = SEGURIDAD_BEARER;
  const soloPropietaria = "Requiere el rol `PROPIETARIA` y el permiso `REPORTES_COBRANZA_VER`.";
  const path = "/informes/alumnos-inactivos/{idInscripcion}/seguimiento";

  registro.registerPath({
    method: "get",
    path: "/informes/alumnos-inactivos",
    tags,
    security,
    summary: "Alumnos inactivos con la cuota al día (US-22)",
    description:
      `${soloPropietaria} Se calcula al pedirlo: inscripciones activas de plan mensual cuyas últimas ` +
      "`INASISTENCIAS_CONSECUTIVAS_INACTIVO` asistencias, o más, en clases cerradas son ausentes, con la cuota " +
      "al día o en los días de gracia. Los de más inasistencias primero. Sin `estado_gestion` no aparecen los " +
      "`IGNORADO`; una marca deja de valer si el alumno asiste después de registrarla.",
    request: { query: listarAlumnosInactivosQuerySchema },
    responses: {
      200: respuestaJson("Los alumnos inactivos", paginaAlumnosInactivosSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "put",
    path,
    tags,
    security,
    summary: "Marcar la gestión de un alumno inactivo",
    description: `${soloPropietaria} Una marca por inscripción: volver a marcar la pisa. La inscripción tiene que estar activa y ser de plan mensual.`,
    request: { params: seguimientoParamSchema, body: cuerpoJson(registrarSeguimientoSchema) },
    responses: {
      200: respuestaJson("La marca guardada", seguimientoSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "delete",
    path,
    tags,
    security,
    summary: "Quitar la marca de gestión: el alumno vuelve a estar pendiente",
    description: soloPropietaria,
    request: { params: seguimientoParamSchema },
    responses: {
      204: { description: "Marca quitada" },
      ...respuestasDeError(400, 401, 403, 404),
    },
  });
}
