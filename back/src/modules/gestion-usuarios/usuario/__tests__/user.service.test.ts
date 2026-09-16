import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { UsuarioService } from "../user.service.js";
import type { IAutorizacion } from "../../permiso/interface/i-autorizacion.js";
import type { UsuarioRepository } from "../user.repository.js";
import type { UsuarioRol } from "../user.types.js";

const baseUsuario = {
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
  roles: [] as UsuarioRol[],
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
  };
}

function crearAutorizacionMock() {
  return { asignarRol: vi.fn(), quitarRol: vi.fn(), tienePermiso: vi.fn() };
}

describe("UsuarioService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let autorizacion: ReturnType<typeof crearAutorizacionMock>;
  let service: UsuarioService;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    autorizacion = crearAutorizacionMock();
    service = new UsuarioService(
      repositorio as unknown as UsuarioRepository,
      autorizacion as unknown as IAutorizacion,
    );
  });

  it("crear crea un usuario nuevo", async () => {
    repositorio.buscarPorEmailOGoogleId.mockResolvedValue(null);
    repositorio.crear.mockResolvedValue(baseUsuario);

    const resultado = await service.crear({
      google_id: "google-123",
      email: "test@example.com",
      nombre: "Ana",
      apellido: "Perez",
    });

    expect(resultado.email).toBe("test@example.com");
    expect(repositorio.crear).toHaveBeenCalledTimes(1);
  });

  it("crear lanza ConflictError si el email o google_id ya existen", async () => {
    repositorio.buscarPorEmailOGoogleId.mockResolvedValue(baseUsuario);

    await expect(
      service.crear({ google_id: "google-123", email: "test@example.com", nombre: "Ana", apellido: "Perez" }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("obtenerPorId lanza NotFoundError si no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(service.obtenerPorId(baseUsuario.id_usuario)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("obtenerPorId retorna el usuario", async () => {
    repositorio.buscarPorId.mockResolvedValue(baseUsuario);

    const resultado = await service.obtenerPorId(baseUsuario.id_usuario);

    expect(resultado.id_usuario).toBe(baseUsuario.id_usuario);
  });

  it("actualizar actualiza campos permitidos", async () => {
    repositorio.buscarPorId.mockResolvedValue(baseUsuario);
    repositorio.actualizar.mockResolvedValue({ ...baseUsuario, nombre: "Nueva" });

    const resultado = await service.actualizar(baseUsuario.id_usuario, { nombre: "Nueva" });

    expect(resultado.nombre).toBe("Nueva");
  });

  it("eliminar elimina un usuario existente", async () => {
    repositorio.buscarPorId.mockResolvedValue(baseUsuario);
    repositorio.eliminar.mockResolvedValue(baseUsuario);

    await service.eliminar(baseUsuario.id_usuario);

    expect(repositorio.eliminar).toHaveBeenCalledWith(baseUsuario.id_usuario);
  });

  it("asignarRol delega en IAutorizacion si todavía no tiene el rol", async () => {
    repositorio.buscarPorId.mockResolvedValue(baseUsuario);
    autorizacion.tienePermiso.mockReturnValue(false);

    await service.asignarRol(baseUsuario.id_usuario, "ALUMNO");

    expect(autorizacion.asignarRol).toHaveBeenCalledWith(baseUsuario.id_usuario, "ALUMNO");
  });

  it("asignarRol lanza ConflictError si el rol ya esta asignado", async () => {
    repositorio.buscarPorId.mockResolvedValue(baseUsuario);
    autorizacion.tienePermiso.mockReturnValue(true);

    await expect(service.asignarRol(baseUsuario.id_usuario, "ALUMNO")).rejects.toBeInstanceOf(ConflictError);
    expect(autorizacion.asignarRol).not.toHaveBeenCalled();
  });

  it("quitarRol delega en IAutorizacion si el usuario tiene el rol", async () => {
    repositorio.buscarPorId.mockResolvedValue(baseUsuario);
    autorizacion.tienePermiso.mockReturnValue(true);

    await service.quitarRol(baseUsuario.id_usuario, "ALUMNO");

    expect(autorizacion.quitarRol).toHaveBeenCalledWith(baseUsuario.id_usuario, "ALUMNO");
  });

  it("quitarRol lanza NotFoundError si el usuario no tiene ese rol", async () => {
    repositorio.buscarPorId.mockResolvedValue(baseUsuario);
    autorizacion.tienePermiso.mockReturnValue(false);

    await expect(service.quitarRol(baseUsuario.id_usuario, "ALUMNO")).rejects.toBeInstanceOf(NotFoundError);
  });
});
