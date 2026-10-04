import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { usuarioConRolesSchema } from "../usuario/usuario.openapi.js";
import { googleLoginSchema } from "./sesion.schemas.js";

const perfilSesionSchema = z
  .object({
    usuario: usuarioConRolesSchema,
    roles: z.array(z.string()).openapi({ example: ["PROPIETARIA"] }),
    permisos: z.array(z.string()).openapi({ example: ["USUARIOS_VER", "ACTIVIDADES_EDITAR"] }),
  })
  .openapi("PerfilSesion");

const sesionIniciadaSchema = perfilSesionSchema
  .extend({ token: z.string().openapi({ description: "JWT para el header Authorization: Bearer" }) })
  .openapi("SesionIniciada");

export function registrarDocumentacionSesion(registro: OpenAPIRegistry): void {
  const tags = ["Sesión"];

  registro.registerPath({
    method: "post",
    path: "/auth/google",
    tags,
    security: [],
    summary: "Iniciar sesión con Google",
    description: "Recibe el `id_token` de Google Identity Services. Solo ingresan usuarios ya dados de alta.",
    request: {
      body: cuerpoJson(
        googleLoginSchema.openapi("GoogleLogin", {
          example: { id_token: "<id_token que entrega Google Identity Services en el front>" },
        }),
      ),
    },
    responses: {
      200: respuestaJson("Sesión iniciada", sesionIniciadaSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/auth/me",
    tags,
    security: SEGURIDAD_BEARER,
    summary: "Obtener el perfil de la sesión actual",
    responses: {
      200: respuestaJson("Perfil del usuario autenticado", perfilSesionSchema),
      ...respuestasDeError(401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/auth/logout",
    tags,
    security: SEGURIDAD_BEARER,
    summary: "Cerrar sesión",
    description: "El JWT no tiene estado en el servidor: el cliente debe descartarlo.",
    responses: {
      200: respuestaJson("Sesión cerrada", z.object({ mensaje: z.string() })),
      ...respuestasDeError(401),
    },
  });
}
