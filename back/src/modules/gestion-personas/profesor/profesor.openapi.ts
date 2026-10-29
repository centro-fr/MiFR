import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { crearProfesoraSchema, profesoraIdParamSchema } from "./profesor.schemas.js";

export const profesoraSchema = z
  .object({
    id_profesora: z.number().int(),
    id_usuario: z.number().int(),
    especialidad: z.string().nullable(),
    fecha_alta: fechaSchema,
    fecha_baja: fechaSchema.nullable(),
    usuario: z.object({ nombre: z.string(), apellido: z.string() }),
  })
  .openapi("Profesora");

export function registrarDocumentacionProfesoras(registro: OpenAPIRegistry): void {
  const tags = ["Profesoras"];
  const security = SEGURIDAD_BEARER;
  const profesora = respuestaJson("Profesora", profesoraSchema);

  registro.registerPath({
    method: "get",
    path: "/profesoras",
    tags,
    security,
    summary: "Listar profesoras",
    description: "Requiere el permiso `HORARIOS_VER`.",
    request: {
      query: z.object({
        incluirBajas: z
          .string()
          .optional()
          .openapi({ description: "Si es 'true', incluye también a las profesoras dadas de baja" }),
      }),
    },
    responses: {
      200: respuestaJson("Profesoras", z.array(profesoraSchema)),
      ...respuestasDeError(401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/profesoras",
    tags,
    security,
    summary: "Dar de alta el perfil de profesora de un usuario",
    description:
      "Requiere el rol PROPIETARIA y el permiso `HORARIOS_EDITAR`. " +
      "El usuario tiene que estar activo y tener el rol PROFESORA.",
    request: {
      body: cuerpoJson(
        crearProfesoraSchema.openapi("CrearProfesora", {
          example: { id_usuario: 2, especialidad: "Posing" },
        }),
      ),
    },
    responses: { 201: profesora, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "delete",
    path: "/profesoras/{id}",
    tags,
    security,
    summary: "Dar de baja una profesora",
    description:
      "Requiere el rol PROPIETARIA y el permiso `HORARIOS_EDITAR`. " +
      "Responde 409 si la profesora todavía tiene horarios activos.",
    request: { params: profesoraIdParamSchema },
    responses: { 200: profesora, ...respuestasDeError(400, 401, 403, 404, 409) },
  });
}
