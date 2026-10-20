import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInsigniasNoConfigurada } from "../../../../__tests__/fakes/logica-insignias-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp as crearAppBase } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import {
  ForbiddenError,
  UnauthorizedError,
  UsuarioNoRegistradoError,
} from "../../../../shared/errors/app-error.js";
import { JwtService } from "../jwt.service.js";
import type { IAutenticacion } from "../interface/i-autenticacion.js";
import type { IAutorizacion } from "../../rol/interface/i-autorizacion.js";
import type { ILogicaUsuarios } from "../../interface/i-logica-usuarios.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";

function createApp(
  dependencias: Omit<
    Parameters<typeof crearAppBase>[0],
    | "gestionServicioEntrenamiento"
    | "gestionPersonas"
    | "gestionInscripcionesYClases"
    | "gestionCuotasYPagos"
    | "difusionPublica"
    | "gestionNotificaciones"
    | "gestionInsignias"
    | "reportes"
  >,
  opciones?: Parameters<typeof crearAppBase>[1],
) {
  return crearAppBase(
    {
      ...dependencias,
      gestionServicioEntrenamiento: {} as unknown as ILogicaServicioEntrenamiento,
      gestionPersonas: {} as unknown as ILogicaPersonas,
      gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
      gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
      difusionPublica: logicaDifusionPublicaNoConfigurada,
      gestionNotificaciones: logicaNotificacionesNoConfigurada,
      gestionInsignias: logicaInsigniasNoConfigurada,
      reportes: logicaInformesNoConfigurada,
    },
    opciones,
  );
}

// La presentación llega al login por ILogicaUsuarios; IAutenticacion solo valida el JWT.
const gestionUsuarios = { iniciarSesion: vi.fn(), iniciarSesionDesarrollo: vi.fn(), obtenerPerfil: vi.fn() };
const gestionUsuariosStub = gestionUsuarios as unknown as ILogicaUsuarios;

beforeEach(() => {
  vi.resetAllMocks();
});
const autorizacionStub = {} as IAutorizacion;

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

describe("POST /api/v1/auth/desarrollo", () => {
  const autenticacion = {
    validarSesion: vi.fn(),
    iniciarSesion: vi.fn(),
    iniciarSesionDesarrollo: vi.fn(),
    obtenerPerfil: vi.fn(),
  };
  const deps = { gestionUsuarios: gestionUsuariosStub, autenticacion, autorizacion: autorizacionStub };

  it("no existe si la app no habilita el login de desarrollo", async () => {
    const response = await request(createApp(deps))
      .post("/api/v1/auth/desarrollo")
      .send({ email: "test@example.com" });

    expect(response.status).toBe(404);
    expect(gestionUsuarios.iniciarSesionDesarrollo).not.toHaveBeenCalled();
  });

  it("responde 200 con la misma sesión que el login con Google cuando está habilitado", async () => {
    gestionUsuarios.iniciarSesionDesarrollo.mockResolvedValue({
      token: "jwt-fake",
      usuario,
      permisos: ["X"],
    });

    const response = await request(createApp(deps, { loginDesarrollo: true }))
      .post("/api/v1/auth/desarrollo")
      .send({ email: " Test@Example.com " });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ token: "jwt-fake", roles: ["ALUMNO"], permisos: ["X"] });
    expect(gestionUsuarios.iniciarSesionDesarrollo).toHaveBeenCalledWith("test@example.com");
  });

  it.each([
    ["no es válido", "no-es-un-email"],
    ["supera los 120 caracteres del DER", `${"a".repeat(109)}@example.com`],
  ])("responde 400 si el email %s", async (_caso, email) => {
    const response = await request(createApp(deps, { loginDesarrollo: true }))
      .post("/api/v1/auth/desarrollo")
      .send({ email });

    expect(response.status).toBe(400);
    expect(gestionUsuarios.iniciarSesionDesarrollo).not.toHaveBeenCalled();
  });

  it("responde 403 si el usuario no está dado de alta", async () => {
    gestionUsuarios.iniciarSesionDesarrollo.mockRejectedValue(new UsuarioNoRegistradoError());

    const response = await request(createApp(deps, { loginDesarrollo: true }))
      .post("/api/v1/auth/desarrollo")
      .send({ email: "nadie@example.com" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USUARIO_NO_REGISTRADO");
  });
});

describe("POST /api/v1/auth/google", () => {
  let autenticacion: IAutenticacion;

  beforeEach(() => {
    autenticacion = {
      validarSesion: vi.fn(),
      iniciarSesion: vi.fn(),
      iniciarSesionDesarrollo: vi.fn(),
      obtenerPerfil: vi.fn(),
    };
  });

  it("responde 200 con token y usuario si el id_token es válido", async () => {
    gestionUsuarios.iniciarSesion.mockResolvedValue({ token: "jwt-fake", usuario, permisos: [] });

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send({ id_token: "token-valido" });

    expect(response.status).toBe(200);
    expect(response.body.usuario.email).toBe("test@example.com");
    expect(response.body.token).toBe("jwt-fake");
    expect(response.body.roles).toEqual(["ALUMNO"]);
  });

  it("devuelve los permisos efectivos para que el front arme el menú", async () => {
    gestionUsuarios.iniciarSesion.mockResolvedValue({
      token: "jwt-fake",
      usuario,
      permisos: ["ACTIVIDADES_VER", "HORARIOS_VER"],
    });

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send({ id_token: "token-valido" });

    expect(response.body.permisos).toEqual(["ACTIVIDADES_VER", "HORARIOS_VER"]);
  });

  it("responde 400 sin id_token", async () => {
    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send({});

    expect(response.status).toBe(400);
  });

  it("pasa el id_token recibido (sin espacios) a iniciarSesion", async () => {
    gestionUsuarios.iniciarSesion.mockResolvedValue({ token: "jwt-fake", usuario, permisos: [] });

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    await request(app).post("/api/v1/auth/google").send({ id_token: "  token-valido  " });

    expect(gestionUsuarios.iniciarSesion).toHaveBeenCalledWith("token-valido");
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
    gestionUsuarios.iniciarSesion.mockResolvedValue({
      token: "jwt-fake",
      usuario: multiRol,
      permisos: [],
    });

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send({ id_token: "token-valido" });

    expect(response.body.roles).toEqual(["ALUMNO", "PROFESORA"]);
  });

  it.each([
    ["vacío", { id_token: "" }],
    ["solo espacios", { id_token: "   " }],
    ["que no es texto", { id_token: 123 }],
    ["de más de 4096 caracteres", { id_token: "a".repeat(4097) }],
  ])("responde 400 con un id_token %s", async (_caso, body) => {
    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(gestionUsuarios.iniciarSesion).not.toHaveBeenCalled();
  });

  it("responde 401 si Google rechaza el id_token", async () => {
    gestionUsuarios.iniciarSesion.mockRejectedValue(new UnauthorizedError("Token de Google inválido"));

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send({ id_token: "token-falso" });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({ code: "UNAUTHORIZED", message: "Token de Google inválido" });
  });

  it("responde 403 USUARIO_NO_REGISTRADO si nadie lo dio de alta", async () => {
    gestionUsuarios.iniciarSesion.mockRejectedValue(new UsuarioNoRegistradoError());

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send({ id_token: "token-valido" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USUARIO_NO_REGISTRADO");
  });

  it("responde 403 FORBIDDEN si el usuario está inactivo", async () => {
    gestionUsuarios.iniciarSesion.mockRejectedValue(new ForbiddenError("Usuario inactivo"));

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send({ id_token: "token-valido" });

    expect(response.status).toBe(403);
    expect(response.body.error).toEqual({ code: "FORBIDDEN", message: "Usuario inactivo" });
  });

  it("responde 500 sin exponer el detalle si falla algo inesperado (ej. la base)", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    gestionUsuarios.iniciarSesion.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5432"));

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    const response = await request(app).post("/api/v1/auth/google").send({ id_token: "token-valido" });

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({ code: "INTERNAL_ERROR", message: "Error interno del servidor" });
    consola.mockRestore();
  });

  it("el login no requiere un JWT previo", async () => {
    gestionUsuarios.iniciarSesion.mockResolvedValue({ token: "jwt-fake", usuario, permisos: [] });

    const app = createApp({
      gestionUsuarios: gestionUsuariosStub,
      autenticacion,
      autorizacion: autorizacionStub,
    });
    await request(app).post("/api/v1/auth/google").send({ id_token: "token-valido" });

    expect(autenticacion.validarSesion).not.toHaveBeenCalled();
  });
});

describe("sesión activa", () => {
  const jwtService = new JwtService("test-secret", "1h");
  let autenticacion: IAutenticacion;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    autenticacion = {
      validarSesion: async (token: string) => jwtService.verificar(token),
      iniciarSesion: vi.fn(),
      iniciarSesionDesarrollo: vi.fn(),
      obtenerPerfil: vi.fn(),
    };
    app = createApp({ gestionUsuarios: gestionUsuariosStub, autenticacion, autorizacion: autorizacionStub });
  });

  function token() {
    return `Bearer ${jwtService.emitir(usuario)}`;
  }

  describe("GET /api/v1/auth/me", () => {
    it("responde 200 con el usuario, sus roles y sus permisos efectivos", async () => {
      gestionUsuarios.obtenerPerfil.mockResolvedValue({ usuario, permisos: ["RUTINAS_VER"] });

      const response = await request(app).get("/api/v1/auth/me").set("Authorization", token());

      expect(response.status).toBe(200);
      expect(response.body.usuario.email).toBe("test@example.com");
      expect(response.body.roles).toEqual(["ALUMNO"]);
      expect(response.body.permisos).toEqual(["RUTINAS_VER"]);
      expect(response.body.token).toBeUndefined();
      expect(gestionUsuarios.obtenerPerfil).toHaveBeenCalledWith(1);
    });

    it("responde 401 sin token", async () => {
      const response = await request(app).get("/api/v1/auth/me");

      expect(response.status).toBe(401);
      expect(gestionUsuarios.obtenerPerfil).not.toHaveBeenCalled();
    });

    it("responde 401 con un token vencido", async () => {
      const vencido = new JwtService("test-secret", "-1s").emitir(usuario);

      const response = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${vencido}`);

      expect(response.status).toBe(401);
    });

    it("responde 403 si el usuario fue dado de baja después del login", async () => {
      gestionUsuarios.obtenerPerfil.mockRejectedValue(new ForbiddenError("Usuario inactivo"));

      const response = await request(app).get("/api/v1/auth/me").set("Authorization", token());

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("responde 200 con la sesión iniciada", async () => {
      const response = await request(app).post("/api/v1/auth/logout").set("Authorization", token());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ mensaje: "Sesión cerrada correctamente" });
    });

    it("responde 401 sin token", async () => {
      const response = await request(app).post("/api/v1/auth/logout");

      expect(response.status).toBe(401);
    });
  });
});

describe("rutas generales de la app", () => {
  const autenticacion = {
    validarSesion: vi.fn(),
    iniciarSesion: vi.fn(),
    iniciarSesionDesarrollo: vi.fn(),
    obtenerPerfil: vi.fn(),
  };

  it("GET /health responde 200", async () => {
    const response = await request(
      createApp({ gestionUsuarios: gestionUsuariosStub, autenticacion, autorizacion: autorizacionStub }),
    ).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("una ruta inexistente responde 404 NOT_FOUND", async () => {
    const response = await request(
      createApp({ gestionUsuarios: gestionUsuariosStub, autenticacion, autorizacion: autorizacionStub }),
    ).get("/api/v1/no-existe");

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Ruta GET /api/v1/no-existe no encontrada",
    });
  });

  it("GET /api/v1/auth/google no existe (solo POST)", async () => {
    const response = await request(
      createApp({ gestionUsuarios: gestionUsuariosStub, autenticacion, autorizacion: autorizacionStub }),
    ).get("/api/v1/auth/google");

    expect(response.status).toBe(404);
  });
});
