import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../../../app.js";
import {
  ForbiddenError,
  UnauthorizedError,
  UsuarioNoRegistradoError,
} from "../../../../shared/errors/app-error.js";
import type { IAutenticacion } from "../interface/i-autenticacion.js";
import type { ILogicaUsuarios } from "../../usuario/interface/i-logica-usuarios.js";

const usuarioServiceStub = {} as ILogicaUsuarios;

const usuario = {
  id_usuario: 1,
  google_id: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
  dni: null,
  telefono: null,
  fecha_nacimiento: new Date("1990-01-01"),
  direccion: null,
  estado: "ACTIVO" as const,
  fecha_alta: new Date(),
  fecha_actualizacion: new Date(),
  roles: [
    {
      id_usuario: 1,
      id_rol: 3,
      rol: { id_rol: 3, codigo: "ALUMNO" as const, nombre: "Alumno", descripcion: null },
      fecha_asignacion: new Date(),
    },
  ],
};

describe("POST /api/auth/google", () => {
  let autenticacion: IAutenticacion;

  beforeEach(() => {
    autenticacion = { verificarToken: vi.fn(), iniciarSesion: vi.fn() };
  });

  it("responde 200 con token y usuario si el id_token es válido", async () => {
    vi.mocked(autenticacion.iniciarSesion).mockResolvedValue({ token: "jwt-fake", usuario });

    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    const response = await request(app).post("/api/auth/google").send({ id_token: "token-valido" });

    expect(response.status).toBe(200);
    expect(response.body.usuario.email).toBe("test@example.com");
    expect(response.body.token).toBe("jwt-fake");
    expect(response.body.roles).toEqual(["ALUMNO"]);
  });

  it("responde 400 sin id_token", async () => {
    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    const response = await request(app).post("/api/auth/google").send({});

    expect(response.status).toBe(400);
  });

  it("pasa el id_token recibido (sin espacios) a iniciarSesion", async () => {
    vi.mocked(autenticacion.iniciarSesion).mockResolvedValue({ token: "jwt-fake", usuario });

    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    await request(app).post("/api/auth/google").send({ id_token: "  token-valido  " });

    expect(autenticacion.iniciarSesion).toHaveBeenCalledWith("token-valido");
  });

  it("devuelve los códigos de todos los roles de un usuario multi-rol", async () => {
    const multiRol = {
      ...usuario,
      roles: [
        ...usuario.roles,
        {
          id_usuario: 1,
          id_rol: 2,
          rol: { id_rol: 2, codigo: "PROFESORA" as const, nombre: "Profesora", descripcion: null },
          fecha_asignacion: new Date(),
        },
      ],
    };
    vi.mocked(autenticacion.iniciarSesion).mockResolvedValue({ token: "jwt-fake", usuario: multiRol });

    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    const response = await request(app).post("/api/auth/google").send({ id_token: "token-valido" });

    expect(response.body.roles).toEqual(["ALUMNO", "PROFESORA"]);
  });

  it.each([
    ["vacío", { id_token: "" }],
    ["solo espacios", { id_token: "   " }],
    ["que no es texto", { id_token: 123 }],
  ])("responde 400 con un id_token %s", async (_caso, body) => {
    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    const response = await request(app).post("/api/auth/google").send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(autenticacion.iniciarSesion).not.toHaveBeenCalled();
  });

  it("responde 401 si Google rechaza el id_token", async () => {
    vi.mocked(autenticacion.iniciarSesion).mockRejectedValue(
      new UnauthorizedError("Token de Google inválido"),
    );

    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    const response = await request(app).post("/api/auth/google").send({ id_token: "token-falso" });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({ code: "UNAUTHORIZED", message: "Token de Google inválido" });
  });

  it("responde 403 USUARIO_NO_REGISTRADO si nadie lo dio de alta", async () => {
    vi.mocked(autenticacion.iniciarSesion).mockRejectedValue(new UsuarioNoRegistradoError());

    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    const response = await request(app).post("/api/auth/google").send({ id_token: "token-valido" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USUARIO_NO_REGISTRADO");
  });

  it("responde 403 FORBIDDEN si el usuario está inactivo", async () => {
    vi.mocked(autenticacion.iniciarSesion).mockRejectedValue(new ForbiddenError("Usuario inactivo"));

    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    const response = await request(app).post("/api/auth/google").send({ id_token: "token-valido" });

    expect(response.status).toBe(403);
    expect(response.body.error).toEqual({ code: "FORBIDDEN", message: "Usuario inactivo" });
  });

  it("responde 500 sin exponer el detalle si falla algo inesperado (ej. la base)", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(autenticacion.iniciarSesion).mockRejectedValue(
      new Error("connect ECONNREFUSED 127.0.0.1:5432"),
    );

    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    const response = await request(app).post("/api/auth/google").send({ id_token: "token-valido" });

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({ code: "INTERNAL_ERROR", message: "Error interno del servidor" });
    consola.mockRestore();
  });

  it("el login no requiere un JWT previo", async () => {
    vi.mocked(autenticacion.iniciarSesion).mockResolvedValue({ token: "jwt-fake", usuario });

    const app = createApp({ usuarioService: usuarioServiceStub, autenticacion });
    await request(app).post("/api/auth/google").send({ id_token: "token-valido" });

    expect(autenticacion.verificarToken).not.toHaveBeenCalled();
  });
});

describe("rutas generales de la app", () => {
  const autenticacion = { verificarToken: vi.fn(), iniciarSesion: vi.fn() };

  it("GET /health responde 200", async () => {
    const response = await request(createApp({ usuarioService: usuarioServiceStub, autenticacion })).get(
      "/health",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("una ruta inexistente responde 404 NOT_FOUND", async () => {
    const response = await request(createApp({ usuarioService: usuarioServiceStub, autenticacion })).get(
      "/api/no-existe",
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Ruta GET /api/no-existe no encontrada",
    });
  });

  it("GET /api/auth/google no existe (solo POST)", async () => {
    const response = await request(createApp({ usuarioService: usuarioServiceStub, autenticacion })).get(
      "/api/auth/google",
    );

    expect(response.status).toBe(404);
  });
});
