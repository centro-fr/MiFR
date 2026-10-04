import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ForbiddenError,
  UnauthorizedError,
  UsuarioNoRegistradoError,
} from "../../../../shared/errors/app-error.js";
import { SesionService } from "../sesion.service.js";
import { JwtService } from "../jwt.service.js";
import type { IAutorizacion } from "../../rol/interface/i-autorizacion.js";
import type { IInfoUsuarios } from "../../usuario/interface/i-info-usuarios.js";
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

function crearUsuariosMock() {
  return {
    obtenerPorId: vi.fn(),
    buscarPorId: vi.fn(),
    identificarPorGoogle: vi.fn(),
  };
}

describe("SesionService", () => {
  let usuarios: ReturnType<typeof crearUsuariosMock>;
  let googleAuth: IAutenticacionGoogleAuth;
  let autorizacion: { permisosEfectivos: ReturnType<typeof vi.fn> };
  let sesion: SesionService;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    usuarios = crearUsuariosMock();
    googleAuth = { verificarToken: vi.fn().mockResolvedValue(googlePayload) };
    autorizacion = { permisosEfectivos: vi.fn().mockResolvedValue(["RUTINAS_VER"]) };
    sesion = new SesionService(
      usuarios as IInfoUsuarios,
      googleAuth,
      new JwtService("test-secret", "1h"),
      autorizacion as unknown as IAutorizacion,
    );
  });

  it("iniciarSesion lanza UsuarioNoRegistradoError si nadie lo pre-inscribió (no hay auto-registro)", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue(null);

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toBeInstanceOf(UsuarioNoRegistradoError);
  });

  it("iniciarSesion identifica al usuario con el google_id y el email que devuelve Google", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue(usuarioExistente);

    const { usuario } = await sesion.iniciarSesion("id-token-valido");

    expect(usuarios.identificarPorGoogle).toHaveBeenCalledWith("google-123", "test@example.com");
    expect(usuario.id_usuario).toBe(usuarioExistente.id_usuario);
  });

  it("iniciarSesion lanza ForbiddenError si el usuario está inactivo", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue({ ...usuarioExistente, estado: "INACTIVO" });

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("iniciarSesion devuelve un JWT propio con el id_usuario y los códigos de rol", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue(usuarioExistente);

    const { token } = await sesion.iniciarSesion("id-token-valido");

    expect(new JwtService("test-secret").verificar(token)).toEqual({ usuarioId: 1, roles: ["ALUMNO"] });
  });

  it("iniciarSesion propaga el UnauthorizedError si Google rechaza el id_token", async () => {
    vi.mocked(googleAuth.verificarToken).mockRejectedValue(new UnauthorizedError("Token de Google inválido"));

    await expect(sesion.iniciarSesion("token-falso")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(usuarios.identificarPorGoogle).not.toHaveBeenCalled();
  });

  it("iniciarSesion lanza ForbiddenError si el usuario encontrado por email está inactivo", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue({ ...usuarioExistente, estado: "INACTIVO" });

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("iniciarSesion permite entrar a un usuario sin roles asignados", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue({ ...usuarioExistente, roles: [] });

    const { token } = await sesion.iniciarSesion("id-token-valido");

    expect(new JwtService("test-secret").verificar(token).roles).toEqual([]);
  });

  it("validarSesion valida el JWT propio y devuelve los roles actuales de la base", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue(usuarioExistente);
    const { token } = await sesion.iniciarSesion("id-token-valido");
    usuarios.buscarPorId.mockResolvedValue(usuarioExistente);

    await expect(sesion.validarSesion(token)).resolves.toEqual({ usuarioId: 1, roles: ["ALUMNO"] });
    expect(usuarios.buscarPorId).toHaveBeenCalledWith(1);
  });

  it("validarSesion usa los roles de la base aunque el token diga otros", async () => {
    const token = new JwtService("test-secret").emitir({ ...usuarioExistente, roles: [] });
    usuarios.buscarPorId.mockResolvedValue(usuarioExistente);

    await expect(sesion.validarSesion(token)).resolves.toEqual({ usuarioId: 1, roles: ["ALUMNO"] });
  });

  it("validarSesion lanza UnauthorizedError con un token inválido", async () => {
    await expect(sesion.validarSesion("no-es-un-jwt")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(usuarios.buscarPorId).not.toHaveBeenCalled();
  });

  it("validarSesion lanza UnauthorizedError si el usuario del token ya no existe", async () => {
    const token = new JwtService("test-secret").emitir(usuarioExistente);
    usuarios.buscarPorId.mockResolvedValue(null);

    await expect(sesion.validarSesion(token)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("validarSesion lanza ForbiddenError si dieron de baja al usuario después del login", async () => {
    const token = new JwtService("test-secret").emitir(usuarioExistente);
    usuarios.buscarPorId.mockResolvedValue({ ...usuarioExistente, estado: "INACTIVO" });

    await expect(sesion.validarSesion(token)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("iniciarSesion devuelve los permisos efectivos del usuario", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue(usuarioExistente);

    const { permisos } = await sesion.iniciarSesion("id-token-valido");

    expect(permisos).toEqual(["RUTINAS_VER"]);
    expect(autorizacion.permisosEfectivos).toHaveBeenCalledWith(1);
  });

  it("iniciarSesion no calcula permisos si el usuario está inactivo", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue({ ...usuarioExistente, estado: "INACTIVO" });

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toBeInstanceOf(ForbiddenError);
    expect(autorizacion.permisosEfectivos).not.toHaveBeenCalled();
  });

  it("obtenerPerfil relee el usuario de la base y devuelve sus permisos efectivos", async () => {
    usuarios.buscarPorId.mockResolvedValue(usuarioExistente);

    await expect(sesion.obtenerPerfil(1)).resolves.toEqual({
      usuario: usuarioExistente,
      permisos: ["RUTINAS_VER"],
    });
    expect(usuarios.buscarPorId).toHaveBeenCalledWith(1);
  });

  it("obtenerPerfil lanza UnauthorizedError si el usuario de la sesión ya no existe", async () => {
    usuarios.buscarPorId.mockResolvedValue(null);

    await expect(sesion.obtenerPerfil(1)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(autorizacion.permisosEfectivos).not.toHaveBeenCalled();
  });

  it("obtenerPerfil lanza ForbiddenError si lo dieron de baja después del login", async () => {
    usuarios.buscarPorId.mockResolvedValue({ ...usuarioExistente, estado: "INACTIVO" });

    await expect(sesion.obtenerPerfil(1)).rejects.toBeInstanceOf(ForbiddenError);
    expect(autorizacion.permisosEfectivos).not.toHaveBeenCalled();
  });

  it("iniciarSesion audita el intento de un correo no registrado", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue(null);

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toThrow();

    const linea = JSON.parse(vi.mocked(console.warn).mock.calls[0][0] as string);
    expect(linea).toMatchObject({ auditoria: "LOGIN_NO_REGISTRADO", email: "test@example.com" });
  });

  it("iniciarSesion audita el intento de un usuario inactivo", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue({ ...usuarioExistente, estado: "INACTIVO" });

    await expect(sesion.iniciarSesion("id-token-valido")).rejects.toThrow();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"auditoria":"LOGIN_USUARIO_INACTIVO"'),
    );
  });

  it("iniciarSesion no audita un login exitoso", async () => {
    usuarios.identificarPorGoogle.mockResolvedValue(usuarioExistente);

    await sesion.iniciarSesion("id-token-valido");

    expect(console.warn).not.toHaveBeenCalled();
  });
});
