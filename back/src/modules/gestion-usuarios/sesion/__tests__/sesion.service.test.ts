import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UsuarioNoRegistradoError } from "../../../../shared/errors/app-error.js";
import { SesionService } from "../sesion.service.js";
import { JwtService } from "../jwt.service.js";
import type { UsuarioRepository } from "../../usuario/user.repository.js";
import type { IAutenticacionGoogleAuth } from "../interface/i-autenticacion-google-auth.js";

const googlePayload = {
  googleId: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
};

const usuarioExistente = {
  id_usuario: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  google_id: "google-123",
  email: "test@example.com",
  nombre: "Ana",
  apellido: "Perez",
  dni: null,
  telefono: null,
  fecha_nacimiento: null,
  direccion: null,
  estado: "ACTIVO" as const,
  fecha_alta: new Date(),
  fecha_actualizacion: new Date(),
  roles: [
    {
      id_usuario: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      rol: "ALUMNO" as const,
      fecha_asignacion: new Date(),
    },
  ],
};

function crearRepositorioMock() {
  return {
    buscarPorId: vi.fn(),
    buscarPorGoogleId: vi.fn(),
    buscarPorEmail: vi.fn(),
    buscarPorEmailOGoogleId: vi.fn(),
    buscarPorDni: vi.fn(),
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    vincularGoogleId: vi.fn(),
    eliminar: vi.fn(),
    asignarRol: vi.fn(),
    quitarRol: vi.fn(),
  };
}

describe("SesionService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let googleAuth: IAutenticacionGoogleAuth;
  let sesion: SesionService;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    googleAuth = { verificarToken: vi.fn().mockResolvedValue(googlePayload) };
    sesion = new SesionService(
      repositorio as unknown as UsuarioRepository,
      googleAuth,
      new JwtService("test-secret", "1h"),
    );
  });

  it("iniciarSesion lanza UsuarioNoRegistradoError si nadie lo pre-inscribió (no hay auto-registro)", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue(null);
    repositorio.buscarPorEmail.mockResolvedValue(null);

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toBeInstanceOf(UsuarioNoRegistradoError);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("iniciarSesion reutiliza el usuario si ya tiene google_id vinculado", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue(usuarioExistente);

    const { usuario } = await sesion.iniciarSesion("id-token-valido");

    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(repositorio.vincularGoogleId).not.toHaveBeenCalled();
    expect(usuario.id_usuario).toBe(usuarioExistente.id_usuario);
  });

  it("iniciarSesion vincula la cuenta si existe un usuario con ese email precargado sin google_id", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue(null);
    repositorio.buscarPorEmail.mockResolvedValue({ ...usuarioExistente, google_id: null });
    repositorio.vincularGoogleId.mockResolvedValue(usuarioExistente);

    const { usuario } = await sesion.iniciarSesion("id-token-valido");

    expect(repositorio.vincularGoogleId).toHaveBeenCalledWith(usuarioExistente.id_usuario, "google-123");
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(usuario.google_id).toBe("google-123");
  });

  it("iniciarSesion lanza ForbiddenError si el usuario está inactivo", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue({ ...usuarioExistente, estado: "INACTIVO" });

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
