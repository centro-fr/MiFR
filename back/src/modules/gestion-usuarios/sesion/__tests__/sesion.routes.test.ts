import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../../../app.js";
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
});
