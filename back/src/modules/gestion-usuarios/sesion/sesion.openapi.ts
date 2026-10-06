import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { usuarioConRolesSchema } from "../usuario/usuario.openapi.js";
import { googleLoginSchema, loginDesarrolloSchema } from "./sesion.schemas.js";

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

export function registrarDocumentacionSesion(
  registro: OpenAPIRegistry,
  { loginDesarrollo = false }: { loginDesarrollo?: boolean } = {},
): void {
  const tags = ["Sesión"];

  if (loginDesarrollo) {
    registro.registerPath({
      method: "post",
      path: "/auth/desarrollo",
      tags,
      security: [],
      summary: "Iniciar sesión sin Google (solo desarrollo)",
      description:
        "Existe solo con `LOGIN_DESARROLLO=true` y fuera de producción. Entra con el email de un usuario " +
        "ya dado de alta y activo, con las mismas reglas que el login con Google, sin verificar la identidad.",
      request: {
        body: cuerpoJson(
          loginDesarrolloSchema.openapi("LoginDesarrollo", { example: { email: "marina.sosa@example.com" } }),
        ),
      },
      responses: {
        200: respuestaJson("Sesión iniciada", sesionIniciadaSchema),
        ...respuestasDeError(400, 403),
      },
    });
  }

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
