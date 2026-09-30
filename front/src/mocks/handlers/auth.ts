import { http, HttpResponse, delay } from "msw";
import type { AuthUser } from "@/types/auth";

const mockUsers: Record<string, AuthUser> = {
  "laura.propietaria@gmail.com": {
    id_usuario: 1,
    email: "laura.propietaria@gmail.com",
    nombre: "Laura",
    apellido: "Gómez",
    roles: ["PROPIETARIA", "PROFESORA"],
    permisos: ["seguridad.matriz.ver", "clases.asistencia.marcar"],
  },
  "maria.profesora@gmail.com": {
    id_usuario: 2,
    email: "maria.profesora@gmail.com",
    nombre: "María",
    apellido: "Pérez",
    roles: ["PROFESORA"],
    permisos: ["clases.asistencia.marcar"],
  },
  "juan.alumno@gmail.com": {
    id_usuario: 3,
    email: "juan.alumno@gmail.com",
    nombre: "Juan",
    apellido: "López",
    roles: ["ALUMNO"],
    permisos: ["rutinas.ver"],
  },
};

let currentUser: AuthUser | null = null;

function resolveUserFromToken(idToken: string | undefined): AuthUser | null {
  if (!idToken || idToken === "mock-google-id-token") return mockUsers["laura.propietaria@gmail.com"];
  if (idToken === "mock-no-registrado") return null;
  if (idToken === "mock-inactivo") {
    return {
      id_usuario: 99,
      email: "inactivo@gmail.com",
      nombre: "Inactivo",
      apellido: "Test",
      roles: ["ALUMNO"],
      permisos: [],
    };
  }
  return mockUsers["laura.propietaria@gmail.com"];
}

export const authHandlers = [
  http.post("*/auth/google", async ({ request }) => {
    await delay(800);
    const body = (await request.json()) as { idToken?: string };
    const user = resolveUserFromToken(body.idToken);

    if (body.idToken === "mock-inactivo") {
      return HttpResponse.json(
        { codigo: "USUARIO_INACTIVO", mensaje: "Su cuenta se encuentra inactiva o dada de baja." },
        { status: 403 },
      );
    }
    if (!user) {
      return HttpResponse.json(
        {
          codigo: "ACCESO_NO_HABILITADO",
          mensaje: "El correo ingresado no se encuentra habilitado en el sistema. Contacte a la administración.",
        },
        { status: 403 },
      );
    }
    currentUser = user;
    return HttpResponse.json({ token: "mock-jwt-token", usuario: user }, { status: 200 });
  }),

  http.get("*/auth/me", async () => {
    await delay(300);
    if (!currentUser) {
      return HttpResponse.json({ codigo: "NO_AUTENTICADO", mensaje: "Sin sesión activa." }, { status: 401 });
    }
    return HttpResponse.json({ usuario: currentUser }, { status: 200 });
  }),

  http.post("*/auth/logout", async () => {
    await delay(200);
    currentUser = null;
    return HttpResponse.json({ mensaje: "Sesión cerrada correctamente" }, { status: 200 });
  }),
];
