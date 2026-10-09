import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../../shared/errors/app-error.js";
import type { IInfoAlumnos } from "../../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { Alumno } from "../../../gestion-personas/alumno/alumno.types.js";
import type { IInfoProfesores } from "../../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { IInfoHorarios } from "../../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { HorarioConDatos } from "../../../gestion-servicio-entrenamiento/horario/horario.types.js";
import type { IInfoPlanes } from "../../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type { Plan } from "../../../gestion-servicio-entrenamiento/plan/plan.types.js";
import type { InscripcionRepository } from "../inscripcion.repository.js";
import type { ReactivarAlumnoInput } from "../inscripcion.schemas.js";
import { InscripcionService } from "../inscripcion.service.js";
import type { InscripcionConDatos } from "../inscripcion.types.js";

function crearMocks() {
  return {
    repositorio: {
      buscarPorId: vi.fn(),
      buscarVigentePorAlumno: vi.fn(),
      activar: vi.fn(),
      reactivar: vi.fn(),
    },
    alumnos: {
      buscarPorId: vi.fn(),
      activar: vi.fn(),
      reactivar: vi.fn(),
    },
    planes: {
      buscarPorId: vi.fn(),
      precioVigente: vi.fn(),
    },
    horarios: { buscarPorIds: vi.fn() },
    profesores: { buscarPorId: vi.fn() },
  };
}

const plan = {
  id_plan: 1,
  tipo: "MENSUAL",
  clases_por_semana: 2,
  profesora_unica: false,
  id_actividad_exclusiva: null,
  fecha_baja: null,
} as Plan;

const alumnoDadoDeBaja = { id_alumno: 5, estado: "BAJA" } as Alumno;
const horario = {
  id_horario: 8,
  id_profesora: 3,
  id_actividad: 4,
  fecha_baja: null,
  actividad: { activo: true },
} as HorarioConDatos;
const inscripcionActiva = {
  id_inscripcion: 12,
  id_alumno: 5,
  estado: "ACTIVA",
} as InscripcionConDatos;

describe("InscripcionService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: InscripcionService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T15:00:00Z"));
    mocks = crearMocks();
    servicio = new InscripcionService(
      mocks.repositorio as unknown as InscripcionRepository,
      mocks.alumnos as unknown as IInfoAlumnos,
      mocks.planes as unknown as IInfoPlanes,
      mocks.horarios as unknown as IInfoHorarios,
      mocks.profesores as unknown as IInfoProfesores,
    );
  });

  afterEach(() => vi.useRealTimers());

  it("activar activa la inscripción y el alumno", async () => {
    mocks.repositorio.buscarPorId.mockResolvedValue({ ...inscripcionActiva, estado: "PREINSCRIPTA" });
    mocks.repositorio.activar.mockResolvedValue({ resultado: "ok", inscripcion: inscripcionActiva });
    mocks.alumnos.activar.mockResolvedValue({} as Alumno);

    await servicio.activar(12);

    expect(mocks.repositorio.activar).toHaveBeenCalledWith(12);
    expect(mocks.alumnos.activar).toHaveBeenCalledWith(5);
  });

  it("activar reintenta el paso del alumno si la inscripción ya estaba activa", async () => {
    mocks.repositorio.buscarPorId.mockResolvedValue(inscripcionActiva);
    mocks.alumnos.activar.mockResolvedValue({} as Alumno);

    await servicio.activar(12);

    expect(mocks.repositorio.activar).not.toHaveBeenCalled();
    expect(mocks.alumnos.activar).toHaveBeenCalledWith(5);
  });

  it("reactivar permite preparar una inscripción nueva para un alumno dado de baja", async () => {
    mocks.alumnos.buscarPorId.mockResolvedValue(alumnoDadoDeBaja);
    mocks.planes.buscarPorId.mockResolvedValue(plan);
    mocks.planes.precioVigente.mockResolvedValue({ id_plan_precio: 15 });
    mocks.profesores.buscarPorId.mockResolvedValue({ id_profesora: 3 });
    mocks.horarios.buscarPorIds.mockResolvedValue([horario]);
    mocks.repositorio.buscarVigentePorAlumno.mockResolvedValue(null);
    mocks.repositorio.reactivar.mockResolvedValue({ resultado: "ok", inscripcion: inscripcionActiva });
    mocks.alumnos.reactivar.mockResolvedValue({} as Alumno);

    const input: ReactivarAlumnoInput = {
      id_plan: 1,
      id_profesora: 3,
      ids_horarios: [8],
      sin_cargo: false,
    };

    await servicio.reactivarAlumno(5, input);

    expect(mocks.repositorio.reactivar).toHaveBeenCalledWith(
      expect.objectContaining({ id_alumno: 5, id_plan_precio: 15, estado: "ACTIVA" }),
      [8],
      expect.any(Date),
    );
    expect(mocks.alumnos.reactivar).toHaveBeenCalledWith(5);
  });

  it("reactivar no cambia al alumno si falla la validación de cupo", async () => {
    mocks.alumnos.buscarPorId.mockResolvedValue(alumnoDadoDeBaja);
    mocks.planes.buscarPorId.mockResolvedValue(plan);
    mocks.planes.precioVigente.mockResolvedValue({ id_plan_precio: 15 });
    mocks.profesores.buscarPorId.mockResolvedValue({ id_profesora: 3 });
    mocks.horarios.buscarPorIds.mockResolvedValue([horario]);
    mocks.repositorio.buscarVigentePorAlumno.mockResolvedValue(null);
    mocks.repositorio.reactivar.mockResolvedValue({ resultado: "sin-cupo" });

    const input: ReactivarAlumnoInput = {
      id_plan: 1,
      id_profesora: 3,
      ids_horarios: [8],
      sin_cargo: false,
    };

    await expect(servicio.reactivarAlumno(5, input)).rejects.toThrow(ConflictError);
    expect(mocks.alumnos.reactivar).not.toHaveBeenCalled();
  });
});
