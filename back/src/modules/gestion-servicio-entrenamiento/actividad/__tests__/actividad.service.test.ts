import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { ActividadService } from "../actividad.service.js";
import type { ActividadRepository } from "../actividad.repository.js";
import type { Actividad, FiltroActividad } from "../actividad.types.js";

function crearRepositorioMock() {
  return {
    crear: vi.fn(),
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorCodigo: vi.fn(),
    actualizar: vi.fn(),
    bajaLogica: vi.fn(),
  };
}

describe("ActividadService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let servicio: ActividadService;

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    servicio = new ActividadService(repositorio as unknown as ActividadRepository);
  });

  const actividadBase: Actividad = {
    id_actividad: 1,
    codigo: "CROSSFIT",
    nombre: "Crossfit",
    descripcion: null,
    modalidad: "GRUPAL",
    cupo_maximo: 20,
    activo: true,
  };

  it("crear crea una actividad", async () => {
    const input = { codigo: "CROSSFIT", nombre: "Crossfit", modalidad: "GRUPAL" as const };
    repositorio.buscarPorCodigo.mockResolvedValue(null);
    repositorio.crear.mockResolvedValue(actividadBase);

    await expect(servicio.crear(input)).resolves.toEqual(actividadBase);
    expect(repositorio.crear).toHaveBeenCalledWith(input);
  });

  it("crear lanza ConflictError si el código ya existe", async () => {
    repositorio.buscarPorCodigo.mockResolvedValue(actividadBase);

    await expect(
      servicio.crear({ codigo: "CROSSFIT", nombre: "Crossfit", modalidad: "GRUPAL" }),
    ).rejects.toThrow(ConflictError);
  });

  it("listar delega el filtro al repositorio", async () => {
    const filtro: FiltroActividad = { busqueda: "cross" };
    repositorio.listar.mockResolvedValue([actividadBase]);

    await expect(servicio.listar(filtro)).resolves.toEqual([actividadBase]);
    expect(repositorio.listar).toHaveBeenCalledWith(filtro);
  });

  it("obtenerPorId lanza NotFoundError si no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.obtenerPorId(1)).rejects.toThrow(NotFoundError);
  });

  it("actualizar permite cambiar la modalidad si conserva un cupo", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...actividadBase, modalidad: "GRUPAL", cupo_maximo: 20 });
    repositorio.actualizar.mockResolvedValue({ ...actividadBase, modalidad: "PERSONALIZADA" });

    await expect(servicio.actualizar(1, { modalidad: "PERSONALIZADA" })).resolves.toMatchObject({
      modalidad: "PERSONALIZADA",
    });
  });

  it("actualizar lanza ConflictError si PERSONALIZADA queda sin cupo", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...actividadBase, modalidad: "GRUPAL", cupo_maximo: null });

    await expect(servicio.actualizar(1, { modalidad: "PERSONALIZADA" })).rejects.toThrow(ConflictError);
  });

  it("darDeBaja desactiva la actividad y devuelve la advertencia", async () => {
    repositorio.buscarPorId.mockResolvedValue(actividadBase);
    repositorio.bajaLogica.mockResolvedValue({ ...actividadBase, activo: false });

    await expect(servicio.darDeBaja(1, true)).resolves.toMatchObject({
      actividad: { activo: false },
      advertencia: expect.any(String),
    });
  });

  it("darDeBaja lanza ConflictError si ya está dada de baja", async () => {
    repositorio.buscarPorId.mockResolvedValue({ ...actividadBase, activo: false });

    await expect(servicio.darDeBaja(1, false)).rejects.toThrow(ConflictError);
  });
});
