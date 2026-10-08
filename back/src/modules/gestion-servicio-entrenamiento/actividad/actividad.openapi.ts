import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  actividadIdParamSchema,
  actualizarActividadSchema,
  crearActividadSchema,
  listarActividadQuerySchema,
} from "./actividad.schemas.js";

export const actividadSchema = z
  .object({
    id_actividad: z.number().int(),
    codigo: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
    cupo_maximo: z.number().int().nullable(),
    activo: z.boolean(),
  })
  .openapi("Actividad");

export function registrarDocumentacionActividades(registro: OpenAPIRegistry): void {
  const tags = ["Actividades"];
  const security = SEGURIDAD_BEARER;
  const actividad = respuestaJson("Actividad", actividadSchema);

  registro.registerPath({
    method: "get",
    path: "/actividades",
    tags,
    security,
    summary: "Listar actividades",
    description: "Requiere el permiso `ACTIVIDADES_VER`. `busqueda` filtra por código o nombre.",
    request: { query: listarActividadQuerySchema },
    responses: {
      200: respuestaJson("Actividades", z.array(actividadSchema)),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/actividades",
    tags,
    security,
    summary: "Dar de alta una actividad",
    description:
      "Requiere el rol PROPIETARIA y el permiso `ACTIVIDADES_EDITAR`. " +
      "`cupo_maximo` es obligatorio para la modalidad PERSONALIZADA.",
    request: {
      body: cuerpoJson(
        crearActividadSchema.openapi("CrearActividad", {
          example: {
            codigo: "GAP",
            nombre: "GAP",
            descripcion: "Trabajo de glúteos, abdominales y piernas",
            modalidad: "GRUPAL",
          },
        }),
      ),
    },
    responses: { 201: actividad, ...respuestasDeError(400, 401, 403, 409) },
  });

  registro.registerPath({
    method: "get",
    path: "/actividades/{id}",
    tags,
    security,
    summary: "Obtener una actividad",
    description: "Requiere el permiso `ACTIVIDADES_VER`.",
    request: { params: actividadIdParamSchema },
    responses: { 200: actividad, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "patch",
    path: "/actividades/{id}",
    tags,
    security,
    summary: "Modificar una actividad activa",
    description:
      "Requiere el rol PROPIETARIA y el permiso `ACTIVIDADES_EDITAR`. " +
      "`cupo_maximo: null` quita el cupo, salvo en la modalidad PERSONALIZADA.",
    request: {
      params: actividadIdParamSchema,
      body: cuerpoJson(
        actualizarActividadSchema.openapi("ActualizarActividad", {
          example: { modalidad: "PERSONALIZADA", cupo_maximo: 4 },
        }),
      ),
    },
    responses: { 200: actividad, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "delete",
    path: "/actividades/{id}",
    tags,
    security,
    summary: "Dar de baja una actividad",
    description:
      "Requiere el rol PROPIETARIA y el permiso `ACTIVIDADES_EDITAR`. " +
      "Baja lógica. Responde 409 si la actividad ya está dada de baja o si todavía tiene horarios " +
      "activos, que hay que dar de baja antes.",
    request: { params: actividadIdParamSchema },
    responses: {
      200: respuestaJson("Actividad dada de baja", actividadSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });
}
