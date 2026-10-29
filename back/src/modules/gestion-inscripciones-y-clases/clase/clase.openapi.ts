import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import { respuestaJson, respuestasDeError, SEGURIDAD_BEARER } from "../../../shared/openapi/registro.js";
import { claseIdParamSchema, listarClasesQuerySchema } from "./clase.schemas.js";
import { claseYAlumnoParamSchema, marcarAsistenciaSchema } from "../asistencia/asistencia.schemas.js";

const fecha = z.string().datetime();
const claseSchema = z
  .object({
    id_clase: z.number().int(),
    id_horario: z.number().int(),
    fecha_clase: fecha,
    id_prof_dictante: z.number().int(),
    estado: z.enum(["PROGRAMADA", "DICTADA", "CANCELADA"]),
    fecha_cierre_asist: fecha.nullable(),
    observaciones: z.string().nullable(),
    horario: z.object({
      hora_inicio: fecha,
      hora_fin: fecha,
      cupo_maximo: z.number().int().nullable(),
      actividad: z.object({
        id_actividad: z.number().int(),
        nombre: z.string(),
        modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
        cupo_maximo: z.number().int().nullable(),
      }),
    }),
  })
  .openapi("Clase");

const claseDelDiaSchema = claseSchema
  .extend({ inscriptos: z.number().int(), cupo_disponible: z.number().int().nullable() })
  .openapi("ClaseDelDia");

const situacionCuotaSchema = z
  .object({
    estado: z.enum([
      "AL_DIA",
      "POR_VENCER",
      "VENCIDA",
      "CLASE_SUELTA_VIGENTE",
      "CLASE_SUELTA_VENCIDA",
      "PENDIENTE_DE_PAGO",
    ]),
    fecha_vencimiento: fecha.nullable(),
    dias_restantes: z.number().int().nullable(),
    puede_asistir: z.boolean().openapi({
      description: "false: se muestra con advertencia. Lo decide VENCIDOS_PUEDEN_ASISTIR para los vencidos",
    }),
    tiene_pago_pendiente: z.boolean().openapi({
      description: "Transferencia informada sin revisar: el alumno asiste sin restricción (US-16)",
    }),
  })
  .openapi("SituacionCuotaEnClase", { description: "Misma forma que la situación de cuota de la ficha" });

const inscriptoEnListaSchema = z.object({
  id_alumno: z.number().int(),
  id_inscripcion: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  asistencia: z.enum(["sin_marcar", "presente", "ausente"]),
  observaciones: z.string().nullable(),
  situacion_cuota: situacionCuotaSchema.nullable(),
});

const asistenciaDeClaseSchema = z
  .object({ clase: claseSchema, inscriptos: z.array(inscriptoEnListaSchema) })
  .openapi("AsistenciaDeClase");

const mensajeSchema = z.object({ mensaje: z.string() });

export function registrarDocumentacionClases(registro: OpenAPIRegistry): void {
  const tags = ["Clases y asistencia"];
  const security = SEGURIDAD_BEARER;
  const permiso = "Requiere sesión y el permiso `ASISTENCIAS_MARCAR` (profesora o propietaria).";

  registro.registerPath({
    method: "get",
    path: "/clases/hoy",
    tags,
    security,
    summary: "Clases de hoy (US-20)",
    description:
      `${permiso} Las clases se materializan desde los horarios activos y no se duplican al consultar más de una vez. ` +
      "`inscriptos` son los que figuran en la lista (inscripción activa, sin pre-inscriptos); `cupo_disponible` es el " +
      "de hoy, que descuenta también las pre-inscripciones con la reserva vigente.",
    responses: {
      200: respuestaJson("Clases de hoy", z.array(claseDelDiaSchema)),
      ...respuestasDeError(401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/clases",
    tags,
    security,
    summary: "Clases de un día pasado, para corregir (US-20)",
    description:
      `${permiso} Además, solo la propietaria (403 para los demás). Materializa las clases de ese día desde los ` +
      "horarios que regían, si todavía no existían. Una que ya terminó sale cerrada (DICTADA) sin ausentes, porque " +
      "nadie la marcó: la propietaria la corrige marcando a cada alumno. Una fecha futura responde 400.",
    request: { query: listarClasesQuerySchema },
    responses: {
      200: respuestaJson("Clases del día", z.array(claseDelDiaSchema)),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/clases/{id}/asistencia",
    tags,
    security,
    summary: "Lista de asistencia de una clase (US-20)",
    description:
      `${permiso} Incluye solo a los inscriptos con la inscripción activa en el horario (un pre-inscripto no figura), ` +
      "con su estado de cuota, sus marcas y sus observaciones.",
    request: { params: claseIdParamSchema },
    responses: {
      200: respuestaJson("Clase y lista de asistencia", asistenciaDeClaseSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "put",
    path: "/clases/{id}/asistencia/{idAlumno}",
    tags,
    security,
    summary: "Marcar asistencia de un alumno (US-20)",
    description:
      `${permiso} La última marca vale. Una clase cerrada solo admite correcciones de la propietaria y una ` +
      "cancelada no admite marcas (409). `observaciones` es opcional: si no viene se conservan las que había y " +
      '`""` las borra. Un pre-inscripto no está en la clase (404).',
    request: {
      params: claseYAlumnoParamSchema,
      body: {
        required: true,
        content: { "application/json": { schema: marcarAsistenciaSchema.openapi("MarcarAsistencia") } },
      },
    },
    responses: {
      200: respuestaJson("Asistencia registrada", mensajeSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/clases/{id}/asistencia/todos-presentes",
    tags,
    security,
    summary: "Marcar todos presentes (US-20)",
    description: `${permiso} El padrón vigente del horario se marca en una única transacción.`,
    request: { params: claseIdParamSchema },
    responses: {
      200: respuestaJson("Asistencias registradas", mensajeSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/clases/{id}/cerrar",
    tags,
    security,
    summary: "Cerrar la asistencia (US-21)",
    description: `${permiso} Completa como ausentes a quienes no fueron marcados y cambia la clase a DICTADA. Repetir el cierre no duplica registros.`,
    request: { params: claseIdParamSchema },
    responses: {
      200: respuestaJson("Clase cerrada", claseSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/clases/{id}/cancelar",
    tags,
    security,
    summary: "Cancelar una clase (US-21)",
    description:
      `${permiso} Además, solo la propietaria (403 para los demás). Pasa una clase PROGRAMADA a CANCELADA: no ` +
      "admite marcas ni genera inasistencias. Una clase dictada o con asistencias ya marcadas responde 409; " +
      "cancelar dos veces devuelve la clase sin cambios. El aviso a los alumnos (CLASE_CANCELADA) llega con las " +
      "notificaciones (US-25).",
    request: { params: claseIdParamSchema },
    responses: {
      200: respuestaJson("Clase cancelada", claseSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });
}
