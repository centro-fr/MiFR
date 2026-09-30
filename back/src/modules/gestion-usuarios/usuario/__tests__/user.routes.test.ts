import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../../../app.js";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { JwtService } from "../../sesion/jwt.service.js";
import type { IAutenticacion } from "../../sesion/interface/i-autenticacion.js";
import type { ILogicaUsuarios } from "../interface/i-logica-usuarios.js";
import type { UsuarioConRoles } from "../user.types.js";

const JWT_SECRET = "test-secret";
const jwtService = new JwtService(JWT_SECRET, "1h");

// Las rutas se prueban contra el contrato HTTP: el service va mockeado y la
// sesión se valida con el JwtService real (mismo secreto que los tokens de prueba).
const autenticacion: IAutenticacion = {
  verificarToken: (token: string) => jwtService.verificar(token),
  iniciarSesion: vi.fn(),
};

function crearServiceMock() {
  return {
    crear: vi.fn(),
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    asignarRol: vi.fn(),
    quitarRol: vi.fn(),
  };
}

const usuario: UsuarioConRoles = {
  id_usuario: 1,
  google_id: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
  dni: null,
  telefono: null,
  fecha_nacimiento: new Date("1990-01-01"),
  direccion: null,
  estado: "ACTIVO",
  fecha_alta: new Date(),
  fecha_actualizacion: new Date(),
  roles: [],
};

const nuevoUsuario = {
  google_id: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
  fecha_nacimiento: "1990-01-01",
};

function token(roles: string[]) {
  return `Bearer ${jwt.sign({ sub: "1", roles }, JWT_SECRET)}`;
}

const PROPIETARIA = token(["PROPIETARIA"]);
const ALUMNO = token(["ALUMNO"]);

describe("rutas de usuarios", () => {
  let service: ReturnType<typeof crearServiceMock>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    service = crearServiceMock();
    app = createApp({ usuarioService: service as unknown as ILogicaUsuarios, autenticacion });
  });

  describe("autenticación", () => {
    it("responde 401 sin header Authorization", async () => {
      const response = await request(app).get("/api/usuarios/1");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("responde 401 si el header no es Bearer", async () => {
      const response = await request(app).get("/api/usuarios/1").set("Authorization", "Basic abc123");

      expect(response.status).toBe(401);
    });

    it("responde 401 con un JWT firmado con otro secreto", async () => {
      const ajeno = jwt.sign({ sub: "1", roles: ["PROPIETARIA"] }, "otro-secreto");

      const response = await request(app).get("/api/usuarios").set("Authorization", `Bearer ${ajeno}`);

      expect(response.status).toBe(401);
      expect(service.listar).not.toHaveBeenCalled();
    });

    it("responde 401 con un JWT vencido", async () => {
      const vencido = jwt.sign(
        { sub: "1", roles: ["PROPIETARIA"], exp: Math.floor(Date.now() / 1000) - 60 },
        JWT_SECRET,
      );

      const response = await request(app).get("/api/usuarios").set("Authorization", `Bearer ${vencido}`);

      expect(response.status).toBe(401);
    });

    it("responde 403 si el rol viejo PROPIETARIO ya no alcanza (el DER usa PROPIETARIA)", async () => {
      const response = await request(app)
        .get("/api/usuarios")
        .set("Authorization", token(["PROPIETARIO"]));

      expect(response.status).toBe(403);
    });

    it("un usuario multi-rol pasa si alguno de sus roles está permitido", async () => {
      service.listar.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/usuarios")
        .set("Authorization", token(["PROFESORA", "PROPIETARIA"]));

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/usuarios", () => {
    it("crea un usuario y responde 201", async () => {
      service.crear.mockResolvedValue(usuario);

      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", PROPIETARIA)
        .send(nuevoUsuario);

      expect(response.status).toBe(201);
      expect(response.body.email).toBe("test@example.com");
      expect(service.crear).toHaveBeenCalledWith({
        ...nuevoUsuario,
        fecha_nacimiento: new Date("1990-01-01"),
      });
    });

    it("permite crear un menor sin email", async () => {
      service.crear.mockResolvedValue({ ...usuario, email: null });
      const { email: _email, google_id: _googleId, ...menor } = nuevoUsuario;

      const response = await request(app).post("/api/usuarios").set("Authorization", PROPIETARIA).send(menor);

      expect(response.status).toBe(201);
    });

    it("responde 400 con body inválido y no llama al service", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", PROPIETARIA)
        .send({ email: "no-es-email" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(service.crear).not.toHaveBeenCalled();
    });

    it("responde 400 si falta fecha_nacimiento (obligatoria en el DER)", async () => {
      const { fecha_nacimiento: _fecha, ...sinFecha } = nuevoUsuario;

      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", PROPIETARIA)
        .send(sinFecha);

      expect(response.status).toBe(400);
      expect(response.body.error.details.fieldErrors.fecha_nacimiento).toBeDefined();
    });

    it("responde 409 si el email o google_id ya existen", async () => {
      service.crear.mockRejectedValue(new ConflictError("Ya existe un usuario con ese email o google_id"));

      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", PROPIETARIA)
        .send(nuevoUsuario);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    it("responde 403 si quien pide no es propietaria", async () => {
      const response = await request(app)
        .post("/api/usuarios")
        .set("Authorization", ALUMNO)
        .send(nuevoUsuario);

      expect(response.status).toBe(403);
      expect(service.crear).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/usuarios", () => {
    it("lista los usuarios si es propietaria", async () => {
      service.listar.mockResolvedValue([usuario]);

      const response = await request(app).get("/api/usuarios").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it.each(["ALUMNO", "PROFESORA", "TUTOR"])("responde 403 al rol %s", async (rol) => {
      const response = await request(app)
        .get("/api/usuarios")
        .set("Authorization", token([rol]));

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/usuarios/:id", () => {
    it("devuelve el usuario y pasa el id como número", async () => {
      service.obtenerPorId.mockResolvedValue(usuario);

      const response = await request(app).get("/api/usuarios/1").set("Authorization", ALUMNO);

      expect(response.status).toBe(200);
      expect(response.body.id_usuario).toBe(1);
      expect(service.obtenerPorId).toHaveBeenCalledWith(1);
    });

    it("responde 404 si no existe", async () => {
      service.obtenerPorId.mockRejectedValue(new NotFoundError("Usuario no encontrado"));

      const response = await request(app).get("/api/usuarios/99").set("Authorization", ALUMNO);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it.each(["no-es-numero", "0", "-1", "1.5"])("responde 400 si el id es %j", async (id) => {
      const response = await request(app).get(`/api/usuarios/${id}`).set("Authorization", ALUMNO);

      expect(response.status).toBe(400);
      expect(service.obtenerPorId).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/usuarios/:id", () => {
    it("actualiza y responde 200", async () => {
      service.actualizar.mockResolvedValue({ ...usuario, telefono: "3511234567" });

      const response = await request(app)
        .patch("/api/usuarios/1")
        .set("Authorization", ALUMNO)
        .send({ telefono: "3511234567" });

      expect(response.status).toBe(200);
      expect(service.actualizar).toHaveBeenCalledWith(1, { telefono: "3511234567" });
    });

    it("responde 400 con body vacío", async () => {
      const response = await request(app).patch("/api/usuarios/1").set("Authorization", ALUMNO).send({});

      expect(response.status).toBe(400);
    });

    it("responde 400 con un dni que no es solo dígitos", async () => {
      const response = await request(app)
        .patch("/api/usuarios/1")
        .set("Authorization", ALUMNO)
        .send({ dni: "40.123.456" });

      expect(response.status).toBe(400);
    });

    it("responde 409 si el dni pertenece a otro usuario", async () => {
      service.actualizar.mockRejectedValue(new ConflictError("Ya existe un usuario con ese dni"));

      const response = await request(app)
        .patch("/api/usuarios/1")
        .set("Authorization", ALUMNO)
        .send({ dni: "40123456" });

      expect(response.status).toBe(409);
    });

    it("responde 404 si el usuario no existe", async () => {
      service.actualizar.mockRejectedValue(new NotFoundError("Usuario no encontrado"));

      const response = await request(app)
        .patch("/api/usuarios/99")
        .set("Authorization", ALUMNO)
        .send({ nombre: "X" });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/usuarios/:id", () => {
    it("elimina y responde 204 sin body", async () => {
      service.eliminar.mockResolvedValue(undefined);

      const response = await request(app).delete("/api/usuarios/1").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(service.eliminar).toHaveBeenCalledWith(1);
    });

    it("responde 404 si el usuario no existe", async () => {
      service.eliminar.mockRejectedValue(new NotFoundError("Usuario no encontrado"));

      const response = await request(app).delete("/api/usuarios/99").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(404);
    });

    it("responde 403 si quien pide no es propietaria", async () => {
      const response = await request(app).delete("/api/usuarios/1").set("Authorization", ALUMNO);

      expect(response.status).toBe(403);
      expect(service.eliminar).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/usuarios/:id/roles", () => {
    it("asigna un rol y responde 201", async () => {
      service.asignarRol.mockResolvedValue(usuario);

      const response = await request(app)
        .post("/api/usuarios/1/roles")
        .set("Authorization", PROPIETARIA)
        .send({ rol: "TUTOR" });

      expect(response.status).toBe(201);
      expect(service.asignarRol).toHaveBeenCalledWith(1, "TUTOR");
    });

    it("responde 400 con un rol que no está en el DER", async () => {
      const response = await request(app)
        .post("/api/usuarios/1/roles")
        .set("Authorization", PROPIETARIA)
        .send({ rol: "PROPIETARIO" });

      expect(response.status).toBe(400);
      expect(service.asignarRol).not.toHaveBeenCalled();
    });

    it("responde 409 si el rol ya estaba asignado", async () => {
      service.asignarRol.mockRejectedValue(new ConflictError("El usuario ya tiene ese rol asignado"));

      const response = await request(app)
        .post("/api/usuarios/1/roles")
        .set("Authorization", PROPIETARIA)
        .send({ rol: "ALUMNO" });

      expect(response.status).toBe(409);
    });

    it("responde 403 si quien pide no es propietaria", async () => {
      const response = await request(app)
        .post("/api/usuarios/1/roles")
        .set("Authorization", ALUMNO)
        .send({ rol: "ALUMNO" });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/usuarios/:id/roles/:rol", () => {
    it("quita el rol y responde 200", async () => {
      service.quitarRol.mockResolvedValue(usuario);

      const response = await request(app)
        .delete("/api/usuarios/1/roles/ALUMNO")
        .set("Authorization", PROPIETARIA);

      expect(response.status).toBe(200);
      expect(service.quitarRol).toHaveBeenCalledWith(1, "ALUMNO");
    });

    it("responde 400 con un rol inválido en la URL", async () => {
      const response = await request(app)
        .delete("/api/usuarios/1/roles/ADMIN")
        .set("Authorization", PROPIETARIA);

      expect(response.status).toBe(400);
    });

    it("responde 404 si el usuario no tiene ese rol", async () => {
      service.quitarRol.mockRejectedValue(new NotFoundError("El usuario no tiene ese rol asignado"));

      const response = await request(app)
        .delete("/api/usuarios/1/roles/ALUMNO")
        .set("Authorization", PROPIETARIA);

      expect(response.status).toBe(404);
    });

    it("responde 403 si quien pide no es propietaria", async () => {
      const response = await request(app).delete("/api/usuarios/1/roles/ALUMNO").set("Authorization", ALUMNO);

      expect(response.status).toBe(403);
    });
  });
});
