import { http, HttpResponse, delay } from "msw";
import { db } from "@/mocks/db";
import { ID_USUARIO_SESION_INICIAL, type UsuarioSemilla } from "@/mocks/data/semilla";
import { MOCK_JWT, errorApi, permisosDeRoles } from "@/mocks/handlers/respuestas";
import { usuarioConRoles } from "@/mocks/handlers/serializar";

// Mock del módulo sesion del back:
// POST /auth/google { id_token } → { token, usuario, roles, permisos }
// GET  /auth/me (Bearer)          → { usuario, roles, permisos }
// Los id_token "mock-inactivo", "mock-invalido" y "mock-no-registrado" simulan los errores.

function perfil(usuario: UsuarioSemilla) {
  return { usuario: usuarioConRoles(usuario), roles: usuario.roles, permisos: permisosDeRoles(usuario.roles) };
}

function usuarioEnSesion(): UsuarioSemilla | undefined {
  return db.usuarios.find((usuario) => usuario.id_usuario === db.idUsuarioSesion);
}

export const authHandlers = [
  http.post("*/api/v1/auth/google", async ({ request }) => {
    await delay(800);
    const { id_token: idToken } = (await request.json()) as { id_token?: string };

    if (!idToken) return errorApi(400, "VALIDATION_ERROR", "Datos inválidos");
    if (idToken === "mock-inactivo") return errorApi(403, "FORBIDDEN", "Usuario inactivo");
    if (idToken === "mock-invalido") return errorApi(401, "UNAUTHORIZED", "Token de Google inválido");
    if (idToken === "mock-no-registrado") {
      return errorApi(
        403,
        "USUARIO_NO_REGISTRADO",
        "No estás registrado en el sistema. Pedile a quien administra el centro que te dé de alta.",
      );
    }

    db.idUsuarioSesion = ID_USUARIO_SESION_INICIAL;
    return HttpResponse.json({ token: MOCK_JWT, ...perfil(usuarioEnSesion()!) });
  }),

  http.get("*/api/v1/auth/me", async ({ request }) => {
    await delay(300);
    const usuario = usuarioEnSesion();
    if (request.headers.get("authorization") !== `Bearer ${MOCK_JWT}` || !usuario) {
      return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    }
    return HttpResponse.json(perfil(usuario));
  }),

  http.post("*/api/v1/auth/logout", async ({ request }) => {
    await delay(200);
    if (request.headers.get("authorization") !== `Bearer ${MOCK_JWT}`) {
      return errorApi(401, "UNAUTHORIZED", "Token no provisto");
    }
    db.idUsuarioSesion = null;
    return HttpResponse.json({ mensaje: "Sesión cerrada correctamente" });
  }),
];
