import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../../shared/errors/app-error.js";
import type { IAutorizacion } from "../../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IInfoUsuarios } from "../../../gestion-usuarios/usuario/interface/i-info-usuarios.js";
import type { ProfesorRepository } from "../profesor.repository.js";
import { ProfesorService } from "../profesor.service.js";

function crearRepositorioMock() {
  return {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorUsuarioId: vi.fn(),
    listar: vi.fn(),
    darDeBaja: vi.fn(),
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
    usuarios = { obtenerPorId: vi.fn().mockResolvedValue({ id_usuario: 5 }) } as unknown as IInfoUsuarios;
    autorizacion = { tieneRol: vi.fn().mockReturnValue(true) } as unknown as IAutorizacion;
    servicio = new ProfesorService(repositorio as unknown as ProfesorRepository, usuarios, autorizacion);
  });

  it("crear vincula el perfil a un usuario con rol PROFESORA", async () => {
    const input = { id_usuario: 5, especialidad: "Funcional" };
    repositorio.buscarPorUsuarioId.mockResolvedValue(null);
    repositorio.crear.mockResolvedValue(perfil);

    await expect(servicio.crear(input)).resolves.toEqual(perfil);
    expect(autorizacion.tieneRol).toHaveBeenCalledWith({ id_usuario: 5 }, "PROFESORA");
  });

  it("crear rechaza un usuario que no tiene el rol PROFESORA", async () => {
    vi.mocked(autorizacion.tieneRol).mockReturnValue(false);

    await expect(servicio.crear({ id_usuario: 5 })).rejects.toThrow(ConflictError);
    expect(repositorio.crear).not.toHaveBeenCalled();
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
});
