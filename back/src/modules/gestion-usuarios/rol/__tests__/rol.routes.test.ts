import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp as crearAppBase } from "../../../../app.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { PermisoCriticoInmutableError } from "../../../../shared/errors/app-error.js";
import { JwtService } from "../../sesion/jwt.service.js";
import { CATALOGO_PERMISOS, CATALOGO_ROLES } from "../rol.catalogo.js";
import type { IAutenticacion } from "../../sesion/interface/i-autenticacion.js";
import type { ILogicaUsuarios } from "../../interface/i-logica-usuarios.js";
import type { IAutorizacion } from "../interface/i-autorizacion.js";
import type { ILogicaServicioEntrenamiento } from "../../../gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import type { ILogicaPersonas } from "../../../gestion-personas/interface/i-logica-personas.js";

function createApp(
  dependencias: Omit<
    Parameters<typeof crearAppBase>[0],
    "gestionServicioEntrenamiento" | "gestionPersonas" | "gestionInscripcionesYClases"
  >,
) {
  return crearAppBase({
    ...dependencias,
    gestionServicioEntrenamiento: {} as unknown as ILogicaServicioEntrenamiento,
    gestionPersonas: {} as unknown as ILogicaPersonas,
    gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
  });
}

const JWT_SECRET = "test-secret";
const jwtService = new JwtService(JWT_SECRET, "1h");

const autenticacion: IAutenticacion = {
  validarSesion: async (token: string) => jwtService.verificar(token),
  iniciarSesion: vi.fn(),
  iniciarSesionDesarrollo: vi.fn(),
  obtenerPerfil: vi.fn(),
};

function crearAutorizacionMock() {
  return {
    asignarRol: vi.fn(),
    quitarRol: vi.fn(),
    tieneRol: vi.fn(),
    tienePermiso: vi.fn().mockResolvedValue(true),
    permisosEfectivos: vi.fn(),
    obtenerMatriz: vi.fn(),
    actualizarMatriz: vi.fn(),
  };
}

function crearGestionUsuariosMock() {
  return { obtenerMatriz: vi.fn(), actualizarMatriz: vi.fn() };
}

function token(roles: string[]) {
  return `Bearer ${jwt.sign({ sub: "1", roles }, JWT_SECRET)}`;
}

const PROPIETARIA = token(["PROPIETARIA"]);

const matriz = {
  roles: [{ id_rol: 1, codigo: "PROPIETARIA", nombre: "Propietaria" }],
  modulos: [
    {
      modulo: "SEGURIDAD",
      permisos: [{ id_permiso: 1, codigo: "SEGURIDAD_MATRIZ_VER", descripcion: null, critico: true }],
    },
  ],
  matriz: { PROPIETARIA: ["SEGURIDAD_MATRIZ_VER"] },
};

const cambios = [{ rol: "PROFESORA", permiso: "RUTINAS_EDITAR", otorgado: true }];

function cambiosDistintos(cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({
    rol: "PROFESORA",
    permiso: `PERMISO_${i}`,
    otorgado: true,
  }));
}

describe("rutas de la matriz de permisos", () => {
  let autorizacion: ReturnType<typeof crearAutorizacionMock>;
  let gestionUsuarios: ReturnType<typeof crearGestionUsuariosMock>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    autorizacion = crearAutorizacionMock();
    gestionUsuarios = crearGestionUsuariosMock();
    app = createApp({
      gestionUsuarios: gestionUsuarios as unknown as ILogicaUsuarios,
      autenticacion,
      autorizacion: autorizacion as unknown as IAutorizacion,
    });
  });

  describe("GET /api/v1/seguridad/matriz", () => {
    it("devuelve la matriz a la propietaria", async () => {
      gestionUsuarios.obtenerMatriz.mockResolvedValue(matriz);

      const response = await request(app).get("/api/v1/seguridad/matriz").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(matriz);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "SEGURIDAD_MATRIZ_VER");
    });

    it("responde 401 sin sesión", async () => {
      const response = await request(app).get("/api/v1/seguridad/matriz");

      expect(response.status).toBe(401);
    });

    it.each(["PROFESORA", "ALUMNO", "TUTOR"])(
      "responde 403 al rol %s aunque tuviera el permiso",
      async (rol) => {
        const response = await request(app)
          .get("/api/v1/seguridad/matriz")
          .set("Authorization", token([rol]));

        expect(response.status).toBe(403);
        expect(gestionUsuarios.obtenerMatriz).not.toHaveBeenCalled();
      },
    );

    it("responde 403 a la propietaria si le falta el permiso de ver la matriz", async () => {
      autorizacion.tienePermiso.mockResolvedValue(false);

      const response = await request(app).get("/api/v1/seguridad/matriz").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(403);
      expect(gestionUsuarios.obtenerMatriz).not.toHaveBeenCalled();
    });

    it("una propietaria que también es profesora puede verla", async () => {
      gestionUsuarios.obtenerMatriz.mockResolvedValue(matriz);

      const response = await request(app)
        .get("/api/v1/seguridad/matriz")
        .set("Authorization", token(["PROFESORA", "PROPIETARIA"]));

      expect(response.status).toBe(200);
    });

    it("responde 500 si falla la consulta del permiso", async () => {
      const consola = vi.spyOn(console, "error").mockImplementation(() => {});
      autorizacion.tienePermiso.mockRejectedValue(new Error("connect ECONNREFUSED"));

      const response = await request(app).get("/api/v1/seguridad/matriz").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(500);
      consola.mockRestore();
    });
  });

  describe("PUT /api/v1/seguridad/matriz", () => {
    it("aplica los cambios y responde 200", async () => {
      const response = await request(app)
        .put("/api/v1/seguridad/matriz")
        .set("Authorization", PROPIETARIA)
        .send({ cambios });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ mensaje: "Matriz de permisos actualizada exitosamente" });
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(1, "SEGURIDAD_MATRIZ_EDITAR");
      expect(gestionUsuarios.actualizarMatriz).toHaveBeenCalledWith(cambios);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('"auditoria":"MATRIZ_PERMISOS_MODIFICADA"'),
      );
    });

    it("normaliza el código de permiso a mayúsculas y sin espacios", async () => {
      await request(app)
        .put("/api/v1/seguridad/matriz")
        .set("Authorization", PROPIETARIA)
        .send({ cambios: [{ rol: "PROFESORA", permiso: " rutinas_editar ", otorgado: true }] });

      expect(gestionUsuarios.actualizarMatriz).toHaveBeenCalledWith(cambios);
    });

    it.each([
      ["sin cambios", { cambios: [] }],
      ["sin body", {}],
      ["con un rol que no está en el DER", { cambios: [{ rol: "ADMIN", permiso: "X", otorgado: true }] }],
      ["sin otorgado", { cambios: [{ rol: "PROFESORA", permiso: "RUTINAS_EDITAR" }] }],
      [
        "con dos cambios para el mismo rol y permiso",
        { cambios: [...cambios, { ...cambios[0], otorgado: false }] },
      ],
      [
        "con más cambios que pares rol-permiso del catálogo",
        { cambios: cambiosDistintos(CATALOGO_ROLES.length * CATALOGO_PERMISOS.length + 1) },
      ],
    ])("responde 400 %s", async (_caso, body) => {
      const response = await request(app)
        .put("/api/v1/seguridad/matriz")
        .set("Authorization", PROPIETARIA)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(gestionUsuarios.actualizarMatriz).not.toHaveBeenCalled();
    });

    it("responde 400 PERMISO_CRITICO_INMUTABLE si intenta quitarle un crítico a la propietaria", async () => {
      gestionUsuarios.actualizarMatriz.mockRejectedValue(
        new PermisoCriticoInmutableError("SEGURIDAD_MATRIZ_EDITAR"),
      );

      const response = await request(app)
        .put("/api/v1/seguridad/matriz")
        .set("Authorization", PROPIETARIA)
        .send({ cambios: [{ rol: "PROPIETARIA", permiso: "SEGURIDAD_MATRIZ_EDITAR", otorgado: false }] });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("PERMISO_CRITICO_INMUTABLE");
    });

    it("responde 403 a una profesora", async () => {
      const response = await request(app)
        .put("/api/v1/seguridad/matriz")
        .set("Authorization", token(["PROFESORA"]))
        .send({ cambios });

      expect(response.status).toBe(403);
      expect(gestionUsuarios.actualizarMatriz).not.toHaveBeenCalled();
    });

    it("responde 403 a la propietaria si le falta el permiso de editar", async () => {
      autorizacion.tienePermiso.mockResolvedValue(false);

      const response = await request(app)
        .put("/api/v1/seguridad/matriz")
        .set("Authorization", PROPIETARIA)
        .send({ cambios });

      expect(response.status).toBe(403);
      expect(gestionUsuarios.actualizarMatriz).not.toHaveBeenCalled();
    });
  });
});
