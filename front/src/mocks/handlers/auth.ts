import { http, HttpResponse, delay } from "msw";
import type { AuthUser, RoleCode } from "@/types/auth";

// Mock alineado al contrato real del back (módulo sesion):
// POST /auth/google { id_token } → { token, usuario, roles, permisos }
// GET  /auth/me (Bearer)          → { usuario, roles, permisos }
// Errores: { error: { code, message } }

interface MockProfile {
  usuario: AuthUser & { estado: string };
}

const MOCK_JWT = "mock-jwt-token";

const mockUsers: Record<string, MockProfile> = {
  "laura.propietaria@gmail.com": {
    usuario: {
      id_usuario: 1,
      email: "laura.propietaria@gmail.com",
      nombre: "Laura",
      apellido: "Gómez",
      estado: "ACTIVO",
      roles: ["PROPIETARIA", "PROFESORA"] as RoleCode[],
      permisos: [
        "SEGURIDAD_MATRIZ_VER",
        "SEGURIDAD_MATRIZ_EDITAR",
        "USUARIOS_VER",
        "USUARIOS_EDITAR",
        "HORARIOS_VER",
        "ALUMNOS_VER",
        "ASISTENCIAS_MARCAR",
        "RUTINAS_VER",
        "RUTINAS_EDITAR",
        "HONORARIOS_VER_PROPIOS",
      ],
    },
  },
  "maria.profesora@gmail.com": {
    usuario: {
      id_usuario: 2,
      email: "maria.profesora@gmail.com",
      nombre: "María",
      apellido: "Pérez",
      estado: "ACTIVO",
      roles: ["PROFESORA"] as RoleCode[],
      permisos: ["HORARIOS_VER", "ALUMNOS_VER", "ASISTENCIAS_MARCAR", "RUTINAS_VER", "RUTINAS_EDITAR", "HONORARIOS_VER_PROPIOS"],
    },
  },
  "juan.alumno@gmail.com": {
    usuario: {
      id_usuario: 3,
      email: "juan.alumno@gmail.com",
      nombre: "Juan",
      apellido: "López",
      estado: "ACTIVO",
      roles: ["ALUMNO"] as RoleCode[],
      permisos: ["RUTINAS_VER"],
    },
  },
};

// Sesión iniciada por defecto como propietaria (modo mock/dev): entrar
// directo a /app/* funciona sin pasar por el login. "Cerrar sesión" la
// vacía y permite probar el flujo de login desde cero.
let currentUser: MockProfile | null = mockUsers["laura.propietaria@gmail.com"];

function sessionPayload(profile: MockProfile) {
  const usuario = profile.usuario;
  return { token: MOCK_JWT, usuario, roles: usuario.roles, permisos: usuario.permisos };
}

export const authHandlers = [
  http.post("*/auth/google", async ({ request }) => {
    await delay(800);
    const body = (await request.json()) as { id_token?: string; idToken?: string };
    const idToken = body.id_token ?? body.idToken;

    if (idToken === "mock-inactivo") {
      return HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "Usuario inactivo" } },
        { status: 403 },
      );
    }
    if (idToken === "mock-invalido" || !idToken) {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Token de Google inválido" } },
        { status: 401 },
      );
    }
    if (idToken === "mock-no-registrado") {
      return HttpResponse.json(
        {
          error: {
            code: "USUARIO_NO_REGISTRADO",
            message: "El correo ingresado no se encuentra habilitado en el sistema. Contacte a la administración.",
          },
        },
        { status: 403 },
      );
    }
    currentUser = mockUsers["laura.propietaria@gmail.com"];
    return HttpResponse.json(sessionPayload(currentUser), { status: 200 });
  }),

  http.get("*/auth/me", async ({ request }) => {
    await delay(300);
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${MOCK_JWT}` || !currentUser) {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sin sesión activa." } },
        { status: 401 },
      );
    }
    const payload = sessionPayload(currentUser);
    const perfil = { usuario: payload.usuario, roles: payload.roles, permisos: payload.permisos };
    return HttpResponse.json(perfil, { status: 200 });
  }),

  http.post("*/auth/logout", async () => {
    await delay(200);
    currentUser = null;
    return HttpResponse.json({ mensaje: "Sesión cerrada correctamente" }, { status: 200 });
  }),
];
