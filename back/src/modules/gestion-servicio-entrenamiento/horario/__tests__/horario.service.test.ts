import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { IInfoActividades } from "../../actividad/interface/i-info-actividades.js";
import type { IInfoProfesores } from "../../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { HorarioRepository } from "../horario.repository.js";
import { HorarioService } from "../horario.service.js";
import type { HorarioConDatos } from "../horario.types.js";

function crearRepositorioMock() {
  return {
    crear: vi.fn(),
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarSuperposicion: vi.fn(),
    tieneActivosDeActividad: vi.fn(),
    actualizar: vi.fn(),
    darDeBaja: vi.fn(),
  };
}

describe("HorarioService", () => {
  let repositorio: ReturnType<typeof crearRepositorioMock>;
  let actividades: IInfoActividades;
  let profesoras: IInfoProfesores;
  let servicio: HorarioService;

  const actividad = {
    id_actividad: 1,
    codigo: "CROSSFIT",
    nombre: "Crossfit",
    descripcion: null,
    modalidad: "GRUPAL" as const,
    cupo_maximo: 20,
    activo: true,
  };
  const profesora = {
    id_profesora: 1,
    id_usuario: 2,
    especialidad: null,
    fecha_alta: new Date("2026-09-30T00:00:00.000Z"),
    fecha_baja: null,
  };
  const horarioBase: HorarioConDatos = {
    id_horario: 1,
    id_actividad: 1,
    id_profesora: 1,
    dia_semana: 1,
    hora_inicio: new Date(Date.UTC(1970, 0, 1, 9, 0)),
    hora_fin: new Date(Date.UTC(1970, 0, 1, 10, 0)),
    cupo_maximo: null,
    fecha_alta: new Date("2026-09-30T00:00:00.000Z"),
    fecha_baja: null,
    actividad,
    profesora,
  };

  beforeEach(() => {
    repositorio = crearRepositorioMock();
    actividades = { buscarPorId: vi.fn().mockResolvedValue(actividad) };
    profesoras = { buscarPorId: vi.fn().mockResolvedValue(profesora), listar: vi.fn() };
    servicio = new HorarioService(repositorio as unknown as HorarioRepository, actividades, profesoras);
    repositorio.buscarSuperposicion.mockResolvedValue(null);
  });

  it("crear guarda un horario y devuelve el cupo heredado", async () => {
    const input = {
      id_actividad: 1,
      id_profesora: 1,
      dia_semana: 1,
      hora_inicio: "09:00",
      hora_fin: "10:00",
    };
    repositorio.crear.mockResolvedValue(horarioBase);

    await expect(servicio.crear(input)).resolves.toMatchObject({ cupo_maximo_efectivo: 20 });
    expect(repositorio.crear).toHaveBeenCalledWith(input);
  });

  it("crear rechaza un horario superpuesto de la misma profesora", async () => {
    repositorio.buscarSuperposicion.mockResolvedValue(horarioBase);

    await expect(
      servicio.crear({
        id_actividad: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "09:30",
        hora_fin: "10:30",
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("crear permite horarios consecutivos de la misma profesora", async () => {
    repositorio.crear.mockResolvedValue(horarioBase);

    await servicio.crear({
      id_actividad: 1,
      id_profesora: 1,
      dia_semana: 1,
      hora_inicio: "10:00",
      hora_fin: "11:00",
    });

    expect(repositorio.buscarSuperposicion).toHaveBeenCalledWith(1, 1, "10:00", "11:00", undefined);
  });

  it("crear rechaza una actividad inexistente o inactiva", async () => {
    vi.mocked(actividades.buscarPorId).mockResolvedValue(null);

    await expect(
      servicio.crear({
        id_actividad: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "09:00",
        hora_fin: "10:00",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("crear rechaza una profesora no elegible", async () => {
    vi.mocked(profesoras.buscarPorId).mockResolvedValue(null);

    await expect(
      servicio.crear({
        id_actividad: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "09:00",
        hora_fin: "10:00",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("actualizar excluye el horario actual al validar superposición", async () => {
    repositorio.buscarPorId.mockResolvedValue(horarioBase);
    repositorio.actualizar.mockResolvedValue({
      ...horarioBase,
      hora_fin: new Date(Date.UTC(1970, 0, 1, 10, 30)),
    });

    await servicio.actualizar(1, { hora_fin: "10:30" });

    expect(repositorio.buscarSuperposicion).toHaveBeenCalledWith(1, 1, "09:00", "10:30", 1);
  });

  it("darDeBaja conserva el registro y advierte sobre inscripciones pendientes de módulo", async () => {
    repositorio.buscarPorId.mockResolvedValue(horarioBase);
    repositorio.darDeBaja.mockResolvedValue({ ...horarioBase, fecha_baja: new Date() });

    await expect(servicio.darDeBaja(1)).resolves.toMatchObject({
      horario: { fecha_baja: expect.any(Date) },
      advertencia: expect.stringContaining("inscripciones futuras"),
    });
  });
});
