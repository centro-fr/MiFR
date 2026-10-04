import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { profesoraSchema } from "../../gestion-personas/profesor/profesor.openapi.js";
import { actividadSchema } from "../actividad/actividad.openapi.js";
import {
  actualizarHorarioSchema,
  crearHorarioSchema,
  horarioIdParamSchema,
  listarHorarioQuerySchema,
} from "./horario.schemas.js";

const horaSchema = z.string().datetime().openapi({
  description: "Hora en UTC sobre la fecha 1970-01-01",
  example: "1970-01-01T09:00:00.000Z",
});

const horarioSchema = z
  .object({
    id_horario: z.number().int(),
    id_actividad: z.number().int(),
    id_profesora: z.number().int(),
    dia_semana: z.number().int().min(1).max(7).openapi({ description: "1 = lunes, 7 = domingo" }),
    hora_inicio: horaSchema,
    hora_fin: horaSchema,
    cupo_maximo: z.number().int().nullable(),
    fecha_alta: fechaSchema,
    fecha_baja: fechaSchema.nullable(),
    actividad: actividadSchema,
    profesora: profesoraSchema,
    cupo_maximo_efectivo: z
      .number()
      .int()
      .nullable()
      .openapi({ description: "Cupo del horario o, si no tiene, el de la actividad" }),
  })
  .openapi("Horario");

const horarioConAdvertenciaSchema = z
  .object({ horario: horarioSchema, advertencia: z.string() })
  .openapi("HorarioConAdvertencia");

export function registrarDocumentacionHorarios(registro: OpenAPIRegistry): void {
  const tags = ["Horarios"];
  const security = SEGURIDAD_BEARER;
  const horario = respuestaJson("Horario", horarioSchema);
  const reglas =
    "La actividad y la profesora tienen que estar activas, y la profesora no puede tener otro " +
    "horario superpuesto ese día (409). `cupo_maximo` es obligatorio si la actividad es PERSONALIZADA " +
    "y no tiene cupo propio.";

  registro.registerPath({
    method: "get",
    path: "/horarios",
    tags,
    security,
    summary: "Listar horarios activos",
    description: "Requiere el permiso `HORARIOS_VER`.",
    request: { query: listarHorarioQuerySchema },
    responses: {
      200: respuestaJson("Horarios", z.array(horarioSchema)),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/horarios",
    tags,
    security,
    summary: "Dar de alta un horario",
    description: `Requiere el rol PROPIETARIA y el permiso \`HORARIOS_EDITAR\`. ${reglas}`,
    request: {
      body: cuerpoJson(
        crearHorarioSchema.openapi("CrearHorario", {
          example: {
            id_actividad: 1,
            id_profesora: 1,
            dia_semana: 1,
            hora_inicio: "18:00",
            hora_fin: "19:00",
          },
        }),
      ),
    },
    responses: { 201: horario, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "get",
    path: "/horarios/{id}",
    tags,
    security,
    summary: "Obtener un horario",
    description: "Requiere el permiso `HORARIOS_VER`.",
    request: { params: horarioIdParamSchema },
    responses: { 200: horario, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "patch",
    path: "/horarios/{id}",
    tags,
    security,
    summary: "Modificar un horario activo",
    description: `Requiere el rol PROPIETARIA y el permiso \`HORARIOS_EDITAR\`. ${reglas}`,
    request: {
      params: horarioIdParamSchema,
      body: cuerpoJson(
        actualizarHorarioSchema.openapi("ActualizarHorario", {
          example: { hora_inicio: "18:30", hora_fin: "19:30" },
        }),
      ),
    },
    responses: { 200: horario, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "delete",
    path: "/horarios/{id}",
    tags,
    security,
    summary: "Dar de baja un horario",
    description: "Requiere el rol PROPIETARIA y el permiso `HORARIOS_EDITAR`. Baja lógica.",
    request: { params: horarioIdParamSchema },
    responses: {
      200: respuestaJson("Horario dado de baja", horarioConAdvertenciaSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });
}
