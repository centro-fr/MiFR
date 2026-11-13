import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  cuerpoJson,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { actualizarMatrizSchema } from "./rol.schemas.js";

const matrizPermisosSchema = z
  .object({
    roles: z.array(z.object({ id_rol: z.number().int(), codigo: z.string(), nombre: z.string() })),
    modulos: z.array(
      z.object({
        modulo: z.string(),
        permisos: z.array(
          z.object({
            id_permiso: z.number().int(),
            codigo: z.string(),
            descripcion: z.string().nullable(),
            critico: z.boolean(),
          }),
        ),
      }),
    ),
    matriz: z
      .record(z.string(), z.array(z.string()))
      .openapi({ description: "Códigos de permiso otorgados, por código de rol" }),
  })
  .openapi("MatrizPermisos");

export function registrarDocumentacionSeguridad(registro: OpenAPIRegistry): void {
  const tags = ["Seguridad"];
  const security = SEGURIDAD_BEARER;

  registro.registerPath({
    method: "get",
    path: "/seguridad/matriz",
    tags,
    security,
    summary: "Obtener la matriz de permisos por rol",
    description: "Requiere el rol PROPIETARIA y el permiso `SEGURIDAD_MATRIZ_VER`.",
    responses: {
      200: respuestaJson("Matriz de permisos", matrizPermisosSchema),
      ...respuestasDeError(401, 403),
    },
  });

  registro.registerPath({
    method: "put",
    path: "/seguridad/matriz",
    tags,
    security,
    summary: "Actualizar la matriz de permisos por rol",
    description:
      "Requiere el rol PROPIETARIA y el permiso `SEGURIDAD_MATRIZ_EDITAR`. " +
      "Los permisos críticos no se le pueden quitar a la propietaria.",
    request: {
      body: cuerpoJson(
        actualizarMatrizSchema.openapi("ActualizarMatriz", {
          example: { cambios: [{ rol: "PROFESORA", permiso: "USUARIOS_VER", otorgado: true }] },
        }),
      ),
    },
    responses: {
      200: respuestaJson("Matriz actualizada", z.object({ mensaje: z.string() })),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });
}
