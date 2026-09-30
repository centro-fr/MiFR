import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ForbiddenError,
  UnauthorizedError,
  UsuarioNoRegistradoError,
} from "../../../../shared/errors/app-error.js";
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

  it("iniciarSesion no busca por email si ya encontró el google_id", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue(usuarioExistente);

    await sesion.iniciarSesion("id-token-valido");

    expect(repositorio.buscarPorGoogleId).toHaveBeenCalledWith("google-123");
    expect(repositorio.buscarPorEmail).not.toHaveBeenCalled();
  });

  it("iniciarSesion busca por el email que devuelve Google si no encuentra el google_id", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue(null);
    repositorio.buscarPorEmail.mockResolvedValue(null);

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toThrow();

    expect(repositorio.buscarPorEmail).toHaveBeenCalledWith("test@example.com");
  });

  it("iniciarSesion devuelve un JWT propio con el id_usuario y los códigos de rol", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue(usuarioExistente);

    const { token } = await sesion.iniciarSesion("id-token-valido");

    expect(new JwtService("test-secret").verificar(token)).toEqual({ usuarioId: 1, roles: ["ALUMNO"] });
  });

  it("iniciarSesion propaga el UnauthorizedError si Google rechaza el id_token", async () => {
    vi.mocked(googleAuth.verificarToken).mockRejectedValue(new UnauthorizedError("Token de Google inválido"));

    await expect(sesion.iniciarSesion("token-falso")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repositorio.buscarPorGoogleId).not.toHaveBeenCalled();
    expect(repositorio.buscarPorEmail).not.toHaveBeenCalled();
  });

  it("iniciarSesion lanza ForbiddenError si el usuario encontrado por email está inactivo", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue(null);
    repositorio.buscarPorEmail.mockResolvedValue({
      ...usuarioExistente,
      google_id: null,
      estado: "INACTIVO",
    });
    repositorio.vincularGoogleId.mockResolvedValue({ ...usuarioExistente, estado: "INACTIVO" });

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("iniciarSesion permite entrar a un usuario sin roles asignados", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue({ ...usuarioExistente, roles: [] });

    const { token } = await sesion.iniciarSesion("id-token-valido");

    expect(new JwtService("test-secret").verificar(token).roles).toEqual([]);
  });

  it("verificarToken valida el JWT propio emitido en el login", async () => {
    repositorio.buscarPorGoogleId.mockResolvedValue(usuarioExistente);
    const { token } = await sesion.iniciarSesion("id-token-valido");

    expect(sesion.verificarToken(token)).toEqual({ usuarioId: 1, roles: ["ALUMNO"] });
  });

  it("verificarToken lanza UnauthorizedError con un token inválido", () => {
    expect(() => sesion.verificarToken("no-es-un-jwt")).toThrow(UnauthorizedError);
  });
});
