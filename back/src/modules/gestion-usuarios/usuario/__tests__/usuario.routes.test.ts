import { logicaNotificacionesNoConfigurada } from "../../../../__tests__/fakes/logica-notificaciones-no-configurada.js";
import { logicaInformesNoConfigurada } from "../../../../__tests__/fakes/logica-informes-no-configurada.js";
import { logicaHonorariosNoConfigurada } from "../../../../__tests__/fakes/logica-honorarios-no-configurada.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp as crearAppBase } from "../../../../app.js";
import { logicaCuotasPagosNoConfigurada } from "../../../../__tests__/fakes/logica-cuotas-pagos-no-configurada.js";
import { logicaDifusionPublicaNoConfigurada } from "../../../../__tests__/fakes/logica-difusion-publica-no-configurada.js";
import { logicaInscripcionesNoConfigurada } from "../../../../__tests__/fakes/logica-inscripciones-no-configurada.js";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { JwtService } from "../../sesion/jwt.service.js";
import type { IAutorizacion } from "../../rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../sesion/interface/i-autenticacion.js";
import type { ILogicaUsuarios } from "../../interface/i-logica-usuarios.js";
import type { UsuarioConRoles } from "../usuario.types.js";
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
    | "reportes"
    | "gestionHonorarios"
  >,
) {
  return crearAppBase({
    ...dependencias,
    gestionServicioEntrenamiento: {} as unknown as ILogicaServicioEntrenamiento,
    gestionPersonas: {} as unknown as ILogicaPersonas,
    gestionInscripcionesYClases: logicaInscripcionesNoConfigurada,
    gestionCuotasYPagos: logicaCuotasPagosNoConfigurada,
    difusionPublica: logicaDifusionPublicaNoConfigurada,
    gestionNotificaciones: logicaNotificacionesNoConfigurada,
    reportes: logicaInformesNoConfigurada,
    gestionHonorarios: logicaHonorariosNoConfigurada,
  });
}

const JWT_SECRET = "test-secret";
const jwtService = new JwtService(JWT_SECRET, "1h");

// Las rutas se prueban contra el contrato HTTP: el service va mockeado y la
// sesión se valida con el JwtService real (mismo secreto que los tokens de prueba).
const autenticacion: IAutenticacion = {
  validarSesion: async (token: string) => jwtService.verificar(token),
  iniciarSesion: vi.fn(),
  iniciarSesionDesarrollo: vi.fn(),
  obtenerPerfil: vi.fn(),
};

// Los permisos salen de la base según los roles del usuario: en el mock, el usuario 1
// (la propietaria de los tokens de prueba) los tiene todos y el resto ninguno.
const ID_PROPIETARIA = 1;

function crearAutorizacionMock() {
  return {
    asignarRol: vi.fn(),
    quitarRol: vi.fn(),
    tieneRol: vi.fn(),
    tienePermiso: vi.fn(async (idUsuario: number) => idUsuario === ID_PROPIETARIA),
    permisosEfectivos: vi.fn(),
    obtenerMatriz: vi.fn(),
    actualizarMatriz: vi.fn(),
  };
}

function crearServiceMock() {
  return {
    crearUsuario: vi.fn(),
    listarUsuarios: vi.fn(),
    obtenerUsuarioPorId: vi.fn(),
    actualizarUsuario: vi.fn(),
    eliminarUsuario: vi.fn(),
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
  const sub = roles.includes("PROPIETARIA") ? ID_PROPIETARIA : 2;
  return `Bearer ${jwt.sign({ sub: String(sub), roles }, JWT_SECRET)}`;
}

const PROPIETARIA = token(["PROPIETARIA"]);
const ALUMNO = token(["ALUMNO"]);
const ID_ALUMNO = 2;

describe("rutas de usuarios", () => {
  let service: ReturnType<typeof crearServiceMock>;
  let autorizacion: ReturnType<typeof crearAutorizacionMock>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    service = crearServiceMock();
    autorizacion = crearAutorizacionMock();
    app = createApp({
      gestionUsuarios: service as unknown as ILogicaUsuarios,
      autenticacion,
      autorizacion: autorizacion as unknown as IAutorizacion,
    });
  });

  describe("autenticación", () => {
    it("responde 401 sin header Authorization", async () => {
      const response = await request(app).get("/api/v1/usuarios/1");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("responde 401 si el header no es Bearer", async () => {
      const response = await request(app).get("/api/v1/usuarios/1").set("Authorization", "Basic abc123");

      expect(response.status).toBe(401);
    });

    it("responde 401 con un JWT firmado con otro secreto", async () => {
      const ajeno = jwt.sign({ sub: "1", roles: ["PROPIETARIA"] }, "otro-secreto");

      const response = await request(app).get("/api/v1/usuarios").set("Authorization", `Bearer ${ajeno}`);

      expect(response.status).toBe(401);
      expect(service.listarUsuarios).not.toHaveBeenCalled();
    });

    it("responde 401 con un JWT vencido", async () => {
      const vencido = jwt.sign(
        { sub: "1", roles: ["PROPIETARIA"], exp: Math.floor(Date.now() / 1000) - 60 },
        JWT_SECRET,
      );

      const response = await request(app).get("/api/v1/usuarios").set("Authorization", `Bearer ${vencido}`);

      expect(response.status).toBe(401);
    });

    it("decide con el permiso de la base, no con el rol que trae el JWT", async () => {
      const response = await request(app)
        .get("/api/v1/usuarios")
        .set("Authorization", token(["PROPIETARIO"]));

      expect(response.status).toBe(403);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(2, "USUARIOS_VER");
    });

    it("un usuario multi-rol pasa si alguno de sus roles otorga el permiso", async () => {
      service.listarUsuarios.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/v1/usuarios")
        .set("Authorization", token(["PROFESORA", "PROPIETARIA"]));

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/v1/usuarios", () => {
    it("exige el permiso USUARIOS_EDITAR", async () => {
      service.crearUsuario.mockResolvedValue(usuario);

      await request(app).post("/api/v1/usuarios").set("Authorization", PROPIETARIA).send(nuevoUsuario);

      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(ID_PROPIETARIA, "USUARIOS_EDITAR");
    });

    it("crea un usuario y responde 201", async () => {
      service.crearUsuario.mockResolvedValue(usuario);

      const response = await request(app)
        .post("/api/v1/usuarios")
        .set("Authorization", PROPIETARIA)
        .send(nuevoUsuario);

      expect(response.status).toBe(201);
      expect(response.body.email).toBe("test@example.com");
      expect(service.crearUsuario).toHaveBeenCalledWith({
        ...nuevoUsuario,
        fecha_nacimiento: new Date("1990-01-01"),
      });
    });

    it("permite crear un menor sin email", async () => {
      service.crearUsuario.mockResolvedValue({ ...usuario, email: null });
      const { email: _email, google_id: _googleId, ...menor } = nuevoUsuario;

      const response = await request(app)
        .post("/api/v1/usuarios")
        .set("Authorization", PROPIETARIA)
        .send(menor);

      expect(response.status).toBe(201);
    });

    it("responde 400 con body inválido y no llama al service", async () => {
      const response = await request(app)
        .post("/api/v1/usuarios")
        .set("Authorization", PROPIETARIA)
        .send({ email: "no-es-email" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(service.crearUsuario).not.toHaveBeenCalled();
    });

    it("responde 400 si falta fecha_nacimiento (obligatoria en el DER)", async () => {
      const { fecha_nacimiento: _fecha, ...sinFecha } = nuevoUsuario;

      const response = await request(app)
        .post("/api/v1/usuarios")
        .set("Authorization", PROPIETARIA)
        .send(sinFecha);

      expect(response.status).toBe(400);
      expect(response.body.error.details.fieldErrors.fecha_nacimiento).toBeDefined();
    });

    it("responde 409 si el email o google_id ya existen", async () => {
      service.crearUsuario.mockRejectedValue(
        new ConflictError("Ya existe un usuario con ese email o google_id"),
      );

      const response = await request(app)
        .post("/api/v1/usuarios")
        .set("Authorization", PROPIETARIA)
        .send(nuevoUsuario);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    it("responde 403 sin el permiso USUARIOS_EDITAR", async () => {
      const response = await request(app)
        .post("/api/v1/usuarios")
        .set("Authorization", ALUMNO)
        .send(nuevoUsuario);

      expect(response.status).toBe(403);
      expect(service.crearUsuario).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/usuarios", () => {
    it("lista los usuarios con el permiso USUARIOS_VER", async () => {
      service.listarUsuarios.mockResolvedValue([usuario]);

      const response = await request(app).get("/api/v1/usuarios").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(ID_PROPIETARIA, "USUARIOS_VER");
    });

    it.each(["ALUMNO", "PROFESORA", "TUTOR"])(
      "responde 403 al rol %s sin el permiso USUARIOS_VER",
      async (rol) => {
        const response = await request(app)
          .get("/api/v1/usuarios")
          .set("Authorization", token([rol]));

        expect(response.status).toBe(403);
      },
    );
  });

  describe("GET /api/v1/usuarios/:id", () => {
    it("devuelve los datos propios sin pedir permiso y pasa el id como número", async () => {
      service.obtenerUsuarioPorId.mockResolvedValue({ ...usuario, id_usuario: ID_ALUMNO });

      const response = await request(app).get(`/api/v1/usuarios/${ID_ALUMNO}`).set("Authorization", ALUMNO);

      expect(response.status).toBe(200);
      expect(response.body.id_usuario).toBe(ID_ALUMNO);
      expect(service.obtenerUsuarioPorId).toHaveBeenCalledWith(ID_ALUMNO);
      expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
    });

    it("responde 403 al pedir otro usuario sin el permiso USUARIOS_VER", async () => {
      const response = await request(app).get("/api/v1/usuarios/1").set("Authorization", ALUMNO);

      expect(response.status).toBe(403);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(ID_ALUMNO, "USUARIOS_VER");
      expect(service.obtenerUsuarioPorId).not.toHaveBeenCalled();
    });

    it("devuelve otro usuario con el permiso USUARIOS_VER", async () => {
      service.obtenerUsuarioPorId.mockResolvedValue({ ...usuario, id_usuario: ID_ALUMNO });

      const response = await request(app)
        .get(`/api/v1/usuarios/${ID_ALUMNO}`)
        .set("Authorization", PROPIETARIA);

      expect(response.status).toBe(200);
    });

    it("responde 404 si no existe", async () => {
      service.obtenerUsuarioPorId.mockRejectedValue(new NotFoundError("Usuario no encontrado"));

      const response = await request(app).get("/api/v1/usuarios/99").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it.each(["no-es-numero", "0", "-1", "1.5"])("responde 400 si el id es %j", async (id) => {
      const response = await request(app).get(`/api/v1/usuarios/${id}`).set("Authorization", ALUMNO);

      expect(response.status).toBe(400);
      expect(service.obtenerUsuarioPorId).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/v1/usuarios/:id", () => {
    it("actualiza los datos propios sin pedir permiso y responde 200", async () => {
      service.actualizarUsuario.mockResolvedValue({
        ...usuario,
        id_usuario: ID_ALUMNO,
        telefono: "3511234567",
      });

      const response = await request(app)
        .patch(`/api/v1/usuarios/${ID_ALUMNO}`)
        .set("Authorization", ALUMNO)
        .send({ telefono: "3511234567" });

      expect(response.status).toBe(200);
      expect(service.actualizarUsuario).toHaveBeenCalledWith(ID_ALUMNO, { telefono: "3511234567" });
      expect(autorizacion.tienePermiso).not.toHaveBeenCalled();
    });

    it("responde 403 al editar otro usuario sin el permiso USUARIOS_EDITAR", async () => {
      const response = await request(app)
        .patch("/api/v1/usuarios/1")
        .set("Authorization", ALUMNO)
        .send({ telefono: "3511234567" });

      expect(response.status).toBe(403);
      expect(autorizacion.tienePermiso).toHaveBeenCalledWith(ID_ALUMNO, "USUARIOS_EDITAR");
      expect(service.actualizarUsuario).not.toHaveBeenCalled();
    });

    it("responde 403 si alguien sin permiso intenta cambiar su propio estado", async () => {
      const response = await request(app)
        .patch(`/api/v1/usuarios/${ID_ALUMNO}`)
        .set("Authorization", ALUMNO)
        .send({ estado: "ACTIVO" });

      expect(response.status).toBe(403);
      expect(service.actualizarUsuario).not.toHaveBeenCalled();
    });

    it("cambia el estado de otro usuario con el permiso USUARIOS_EDITAR y lo audita", async () => {
      service.actualizarUsuario.mockResolvedValue({ ...usuario, id_usuario: ID_ALUMNO, estado: "INACTIVO" });

      const response = await request(app)
        .patch(`/api/v1/usuarios/${ID_ALUMNO}`)
        .set("Authorization", PROPIETARIA)
        .send({ estado: "INACTIVO" });

      expect(response.status).toBe(200);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('"auditoria":"ESTADO_USUARIO_MODIFICADO"'),
      );
    });

    it.each([{ dni: "40123456" }, { fecha_nacimiento: "1980-01-01" }])(
      "responde 403 si alguien sin permiso cambia su propio %j (identifican a la persona)",
      async (cambio) => {
        const response = await request(app)
          .patch(`/api/v1/usuarios/${ID_ALUMNO}`)
          .set("Authorization", ALUMNO)
          .send(cambio);

        expect(response.status).toBe(403);
        expect(autorizacion.tienePermiso).toHaveBeenCalledWith(ID_ALUMNO, "USUARIOS_EDITAR");
        expect(service.actualizarUsuario).not.toHaveBeenCalled();
      },
    );

    it("responde 403 si quien tiene USUARIOS_EDITAR delegado intenta cambiar un estado sin ser propietaria", async () => {
      autorizacion.tienePermiso.mockResolvedValue(true);

      const response = await request(app)
        .patch("/api/v1/usuarios/1")
        .set("Authorization", token(["PROFESORA"]))
        .send({ estado: "INACTIVO" });

      expect(response.status).toBe(403);
      expect(service.actualizarUsuario).not.toHaveBeenCalled();
    });

    it("responde 400 con body vacío", async () => {
      const response = await request(app)
        .patch("/api/v1/usuarios/1")
        .set("Authorization", PROPIETARIA)
        .send({});

      expect(response.status).toBe(400);
    });

    it("responde 400 con un dni que no es solo dígitos", async () => {
      const response = await request(app)
        .patch("/api/v1/usuarios/1")
        .set("Authorization", PROPIETARIA)
        .send({ dni: "40.123.456" });

      expect(response.status).toBe(400);
    });

    it("responde 409 si el dni pertenece a otro usuario", async () => {
      service.actualizarUsuario.mockRejectedValue(new ConflictError("Ya existe un usuario con ese dni"));

      const response = await request(app)
        .patch("/api/v1/usuarios/1")
        .set("Authorization", PROPIETARIA)
        .send({ dni: "40123456" });

      expect(response.status).toBe(409);
    });

    it("responde 404 si el usuario no existe", async () => {
      service.actualizarUsuario.mockRejectedValue(new NotFoundError("Usuario no encontrado"));

      const response = await request(app)
        .patch("/api/v1/usuarios/99")
        .set("Authorization", PROPIETARIA)
        .send({ nombre: "X" });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/usuarios/:id", () => {
    it("elimina y responde 204 sin body", async () => {
      service.eliminarUsuario.mockResolvedValue(undefined);

      const response = await request(app).delete("/api/v1/usuarios/1").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(service.eliminarUsuario).toHaveBeenCalledWith(1);
    });

    it("responde 404 si el usuario no existe", async () => {
      service.eliminarUsuario.mockRejectedValue(new NotFoundError("Usuario no encontrado"));

      const response = await request(app).delete("/api/v1/usuarios/99").set("Authorization", PROPIETARIA);

      expect(response.status).toBe(404);
    });

    it("responde 403 sin el permiso USUARIOS_EDITAR", async () => {
      const response = await request(app).delete("/api/v1/usuarios/1").set("Authorization", ALUMNO);

      expect(response.status).toBe(403);
      expect(service.eliminarUsuario).not.toHaveBeenCalled();
    });
  });

  // La propietaria puede delegar USUARIOS_EDITAR: quien lo recibe no puede administrar roles ni cuentas.
  describe("con USUARIOS_EDITAR delegado a quien no es propietaria", () => {
    beforeEach(() => {
      autorizacion.tienePermiso.mockResolvedValue(true);
    });

    it.each([
      ["POST", "/api/v1/usuarios/2/roles", { rol: "PROPIETARIA" }],
      ["DELETE", "/api/v1/usuarios/1/roles/PROPIETARIA", undefined],
      ["DELETE", "/api/v1/usuarios/1", undefined],
    ] as const)("responde 403 a %s %s", async (metodo, ruta, body) => {
      const pedido = metodo === "POST" ? request(app).post(ruta).send(body) : request(app).delete(ruta);

      const response = await pedido.set("Authorization", token(["PROFESORA"]));

      expect(response.status).toBe(403);
      expect(service.asignarRol).not.toHaveBeenCalled();
      expect(service.quitarRol).not.toHaveBeenCalled();
      expect(service.eliminarUsuario).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/usuarios/:id/roles", () => {
    it("asigna un rol, responde 201 y lo audita", async () => {
      service.asignarRol.mockResolvedValue(usuario);

      const response = await request(app)
        .post("/api/v1/usuarios/1/roles")
        .set("Authorization", PROPIETARIA)
        .send({ rol: "TUTOR" });

      expect(response.status).toBe(201);
      expect(service.asignarRol).toHaveBeenCalledWith(1, "TUTOR");
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"auditoria":"ROL_ASIGNADO"'));
    });

    it("responde 400 con un rol que no está en el DER", async () => {
      const response = await request(app)
        .post("/api/v1/usuarios/1/roles")
        .set("Authorization", PROPIETARIA)
        .send({ rol: "PROPIETARIO" });

      expect(response.status).toBe(400);
      expect(service.asignarRol).not.toHaveBeenCalled();
    });

    it("responde 409 si el rol ya estaba asignado", async () => {
      service.asignarRol.mockRejectedValue(new ConflictError("El usuario ya tiene ese rol asignado"));

      const response = await request(app)
        .post("/api/v1/usuarios/1/roles")
        .set("Authorization", PROPIETARIA)
        .send({ rol: "ALUMNO" });

      expect(response.status).toBe(409);
    });

    it("responde 403 sin el permiso USUARIOS_EDITAR", async () => {
      const response = await request(app)
        .post("/api/v1/usuarios/1/roles")
        .set("Authorization", ALUMNO)
        .send({ rol: "ALUMNO" });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/usuarios/:id/roles/:rol", () => {
    it("quita el rol y responde 200", async () => {
      service.quitarRol.mockResolvedValue(usuario);

      const response = await request(app)
        .delete("/api/v1/usuarios/1/roles/ALUMNO")
        .set("Authorization", PROPIETARIA);

      expect(response.status).toBe(200);
      expect(service.quitarRol).toHaveBeenCalledWith(1, "ALUMNO");
    });

    it("responde 400 con un rol inválido en la URL", async () => {
      const response = await request(app)
        .delete("/api/v1/usuarios/1/roles/ADMIN")
        .set("Authorization", PROPIETARIA);

      expect(response.status).toBe(400);
    });

    it("responde 404 si el usuario no tiene ese rol", async () => {
      service.quitarRol.mockRejectedValue(new NotFoundError("El usuario no tiene ese rol asignado"));

      const response = await request(app)
        .delete("/api/v1/usuarios/1/roles/ALUMNO")
        .set("Authorization", PROPIETARIA);

      expect(response.status).toBe(404);
    });

    it("responde 403 sin el permiso USUARIOS_EDITAR", async () => {
      const response = await request(app)
        .delete("/api/v1/usuarios/1/roles/ALUMNO")
        .set("Authorization", ALUMNO);

      expect(response.status).toBe(403);
    });
  });
});
