import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../../../../shared/db/client.js", () => ({
  prisma: {
    usuarios: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    usuario_roles: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    roles: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("../../../../shared/db/client.js");
const { createApp } = await import("../../../../app.js");
const { UsuarioRepository } = await import("../user.repository.js");
const { UsuarioService } = await import("../user.service.js");
const { PermisoRepository } = await import("../../permiso/permiso.repository.js");
const { PermisoService } = await import("../../permiso/permiso.service.js");
const { JwtService } = await import("../../sesion/jwt.service.js");

const JWT_SECRET = "test-secret";
const jwtService = new JwtService(JWT_SECRET, "1h");
const usuarioService = new UsuarioService(
  new UsuarioRepository(),
  new PermisoService(new PermisoRepository()),
);
// Estas pruebas ejercitan usuarios/roles; el login con Google se cubre en auth.
const autenticacionStub = {
  verificarToken: (token: string) => jwtService.verificar(token),
  iniciarSesion: vi.fn(),
};

function buildApp() {
  return createApp({ usuarioService, autenticacion: autenticacionStub });
}

const baseUsuario = {
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
  roles: [],
};

const rolAlumno = { id_rol: 3, codigo: "ALUMNO" as const, nombre: "Alumno", descripcion: null };

function tokenPropietario() {
  return jwt.sign({ sub: String(baseUsuario.id_usuario), roles: ["PROPIETARIA"] }, JWT_SECRET);
}

function tokenAlumno() {
  return jwt.sign({ sub: String(baseUsuario.id_usuario), roles: ["ALUMNO"] }, JWT_SECRET);
}

describe("autenticación de rutas de usuarios", () => {
  it("responde 401 sin token", async () => {
    const app = buildApp();
    const response = await request(app).get(`/api/usuarios/${baseUsuario.id_usuario}`);

    expect(response.status).toBe(401);
  });

  it("responde 403 si el rol no alcanza para el recurso", async () => {
    const app = buildApp();
    const response = await request(app).get("/api/usuarios").set("Authorization", `Bearer ${tokenAlumno()}`);

    expect(response.status).toBe(403);
  });
});

describe("POST /api/usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea un usuario y responde 201", async () => {
    vi.mocked(prisma.usuarios.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.usuarios.create).mockResolvedValue(baseUsuario);

    const app = buildApp();
    const response = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${tokenPropietario()}`)
      .send({
        google_id: "google-123",
        email: "test@example.com",
        nombre: "Ana",
        apellido: "Perez",
        fecha_nacimiento: "1990-01-01",
      });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe("test@example.com");
  });

  it("responde 400 con body inválido", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${tokenPropietario()}`)
      .send({ email: "no-es-email" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responde 409 si el email o google_id ya existen", async () => {
    vi.mocked(prisma.usuarios.findFirst).mockResolvedValue(baseUsuario);

    const app = buildApp();
    const response = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${tokenPropietario()}`)
      .send({
        google_id: "google-123",
        email: "test@example.com",
        nombre: "Ana",
        apellido: "Perez",
        fecha_nacimiento: "1990-01-01",
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });
});

describe("GET /api/usuarios/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 404 si no existe", async () => {
    vi.mocked(prisma.usuarios.findUnique).mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .get(`/api/usuarios/${baseUsuario.id_usuario}`)
      .set("Authorization", `Bearer ${tokenAlumno()}`);

    expect(response.status).toBe(404);
  });

  it("responde 400 si el id no es un entero válido", async () => {
    const app = buildApp();
    const response = await request(app)
      .get("/api/usuarios/no-es-numero")
      .set("Authorization", `Bearer ${tokenAlumno()}`);

    expect(response.status).toBe(400);
  });
});

describe("POST /api/usuarios/:id/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asigna un rol y responde 201", async () => {
    vi.mocked(prisma.usuarios.findUnique)
      .mockResolvedValueOnce(baseUsuario)
      .mockResolvedValueOnce({
        ...baseUsuario,
        roles: [{ id_usuario: 1, id_rol: 3, rol: rolAlumno, fecha_asignacion: new Date() }],
      } as unknown as typeof baseUsuario);
    vi.mocked(prisma.roles.findUnique).mockResolvedValue(rolAlumno);
    vi.mocked(prisma.usuario_roles.create).mockResolvedValue({
      id_usuario: baseUsuario.id_usuario,
      id_rol: rolAlumno.id_rol,
      fecha_asignacion: new Date(),
    });

    const app = buildApp();
    const response = await request(app)
      .post(`/api/usuarios/${baseUsuario.id_usuario}/roles`)
      .set("Authorization", `Bearer ${tokenPropietario()}`)
      .send({ rol: "ALUMNO" });

    expect(response.status).toBe(201);
    expect(response.body.roles).toHaveLength(1);
  });

  it("responde 400 con un rol invalido", async () => {
    const app = buildApp();
    const response = await request(app)
      .post(`/api/usuarios/${baseUsuario.id_usuario}/roles`)
      .set("Authorization", `Bearer ${tokenPropietario()}`)
      .send({ rol: "NO_EXISTE" });

    expect(response.status).toBe(400);
  });

  it("responde 403 si quien pide no es propietario", async () => {
    const app = buildApp();
    const response = await request(app)
      .post(`/api/usuarios/${baseUsuario.id_usuario}/roles`)
      .set("Authorization", `Bearer ${tokenAlumno()}`)
      .send({ rol: "ALUMNO" });

    expect(response.status).toBe(403);
  });
});
