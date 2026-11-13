import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IInfoUsuarios } from "../../../gestion-usuarios/usuario/interface/i-info-usuarios.js";
import type { ProfesorRepository } from "../profesor.repository.js";
import type { ActualizarProfesoraInput } from "../profesor.schemas.js";
import { ProfesorService } from "../profesor.service.js";

function crearRepositorioMock() {
  return {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorUsuarioId: vi.fn(),
    listar: vi.fn(),
    darDeBaja: vi.fn(),
    actualizar: vi.fn(),
  };
}

describe("ProfesorService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let usuarios: IInfoUsuarios;
  let autorizacion: IAutorizacion;
  let servicio: ProfesorService;

  const perfil = {
    id_profesora: 1,
    id_usuario: 5,
    especialidad: "Funcional",
    fecha_alta: new Date("2026-09-30T00:00:00.000Z"),
    fecha_baja: null,
  };

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    usuarios = {
      obtenerPorId: vi.fn().mockResolvedValue({ id_usuario: 5, estado: "ACTIVO" }),
    } as unknown as IInfoUsuarios;
    autorizacion = { tieneRol: vi.fn().mockReturnValue(true) } as unknown as IAutorizacion;
    servicio = new ProfesorService(repositorio as unknown as ProfesorRepository, usuarios, autorizacion);
  });

  it("crear vincula el perfil a un usuario con rol PROFESORA", async () => {
    const input = { id_usuario: 5, especialidad: "Funcional" };
    repositorio.buscarPorUsuarioId.mockResolvedValue(null);
    repositorio.crear.mockResolvedValue(perfil);

    await expect(servicio.crear(input)).resolves.toEqual(perfil);
    expect(autorizacion.tieneRol).toHaveBeenCalledWith({ id_usuario: 5, estado: "ACTIVO" }, "PROFESORA");
  });

  it("crear rechaza con ValidationError un usuario que no tiene el rol PROFESORA", async () => {
    vi.mocked(autorizacion.tieneRol).mockReturnValue(false);

    await expect(servicio.crear({ id_usuario: 5 })).rejects.toThrow(ValidationError);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("crear rechaza usuarios inactivos", async () => {
    vi.mocked(usuarios.obtenerPorId).mockResolvedValue({ id_usuario: 5, estado: "INACTIVO" } as never);

    await expect(servicio.crear({ id_usuario: 5 })).rejects.toThrow(ValidationError);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("buscarPorId oculta profesoras cuyo usuario está inactivo", async () => {
    repositorio.buscarPorId.mockResolvedValue(perfil);
    vi.mocked(usuarios.obtenerPorId).mockResolvedValue({ id_usuario: 5, estado: "INACTIVO" } as never);

    await expect(servicio.buscarPorId(1)).resolves.toBeNull();
  });

  it("crear rechaza un perfil duplicado", async () => {
    repositorio.buscarPorUsuarioId.mockResolvedValue(perfil);

    await expect(servicio.crear({ id_usuario: 5 })).rejects.toThrow(ConflictError);
  });

  it("darDeBaja conserva el perfil y registra la fecha de baja", async () => {
    const profesoraDadaDeBaja = { ...perfil, fecha_baja: new Date() };
    repositorio.buscarPorId.mockResolvedValue(perfil);
    repositorio.darDeBaja.mockResolvedValue(profesoraDadaDeBaja);

    await expect(servicio.darDeBaja(1)).resolves.toEqual(profesoraDadaDeBaja);
    expect(repositorio.darDeBaja).toHaveBeenCalledWith(1);
  });

  it("darDeBaja lanza ConflictError si ya estaba dada de baja", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...perfil, fecha_baja: new Date() });

    await expect(servicio.darDeBaja(1)).rejects.toThrow(ConflictError);
  });

  it("buscarPorId devuelve la profesora si está activa y su usuario tiene el rol", async () => {
    repositorio.buscarPorId.mockResolvedValue(perfil);

    await expect(servicio.buscarPorId(1)).resolves.toEqual(perfil);
  });

  it("buscarPorId devuelve null si la profesora no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.buscarPorId(99)).resolves.toBeNull();
  });

  it("buscarPorId devuelve null si la profesora está dada de baja, sin consultar al usuario", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...perfil, fecha_baja: new Date() });

    await expect(servicio.buscarPorId(1)).resolves.toBeNull();
    expect(usuarios.obtenerPorId).not.toHaveBeenCalled();
  });

  it("buscarPorId devuelve null si a su usuario le quitaron el rol PROFESORA", async () => {
    repositorio.buscarPorId.mockResolvedValue(perfil);
    vi.mocked(autorizacion.tieneRol).mockReturnValue(false);

    await expect(servicio.buscarPorId(1)).resolves.toBeNull();
  });

  it("buscarPorUsuario devuelve la profesora activa de ese usuario", async () => {
    repositorio.buscarPorUsuarioId.mockResolvedValue(perfil);

    await expect(servicio.buscarPorUsuario(5)).resolves.toEqual(perfil);
    expect(repositorio.buscarPorUsuarioId).toHaveBeenCalledWith(5);
  });

  it("buscarPorUsuario devuelve null si el usuario no tiene perfil de profesora o está dada de baja", async () => {
    repositorio.buscarPorUsuarioId.mockResolvedValueOnce(null);
    await expect(servicio.buscarPorUsuario(5)).resolves.toBeNull();

    repositorio.buscarPorUsuarioId.mockResolvedValueOnce({ ...perfil, fecha_baja: new Date() });
    await expect(servicio.buscarPorUsuario(5)).resolves.toBeNull();
  });

  it("listar devuelve las profesoras del repositorio", async () => {
    repositorio.listar.mockResolvedValue([perfil]);

    await expect(servicio.listar()).resolves.toEqual([perfil]);
  });

  it("darDeBaja lanza NotFoundError si la profesora no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.darDeBaja(99)).rejects.toThrow(NotFoundError);
    expect(repositorio.darDeBaja).not.toHaveBeenCalled();
  });

  it("actualizar cambia la especialidad", async () => {
    repositorio.buscarPorId.mockResolvedValue(perfil);
    repositorio.actualizar.mockResolvedValue({ ...perfil, especialidad: "Posing" });

    await expect(servicio.actualizar(1, { especialidad: "Posing" })).resolves.toMatchObject({
      especialidad: "Posing",
    });
    expect(repositorio.actualizar).toHaveBeenCalledWith(1, { especialidad: "Posing" });
  });

  it("actualizar reincorpora a la profesora y permite cambiar su especialidad", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...perfil, fecha_baja: new Date() });
    repositorio.actualizar.mockResolvedValue({ ...perfil, especialidad: "Posing" });

    await expect(servicio.actualizar(1, { especialidad: "Posing", reactivar: true })).resolves.toMatchObject({
      fecha_baja: null,
      especialidad: "Posing",
    });
    expect(repositorio.actualizar).toHaveBeenCalledWith(1, { especialidad: "Posing", fecha_baja: null });
  });

  it("actualizar reincorpora sin cambiar la especialidad", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...perfil, fecha_baja: new Date() });
    repositorio.actualizar.mockResolvedValue(perfil);

    await servicio.actualizar(1, { reactivar: true } satisfies ActualizarProfesoraInput);

    expect(repositorio.actualizar).toHaveBeenCalledWith(1, { fecha_baja: null });
  });

  it("actualizar rechaza reincorporar una profesora activa", async () => {
    repositorio.buscarPorId.mockResolvedValue(perfil);

    await expect(servicio.actualizar(1, { reactivar: true })).rejects.toThrow(ConflictError);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("actualizar lanza NotFoundError si la profesora no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.actualizar(99, { especialidad: "Posing" })).rejects.toThrow(NotFoundError);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });
});
