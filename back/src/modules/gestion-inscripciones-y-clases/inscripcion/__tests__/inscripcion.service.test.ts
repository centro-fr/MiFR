import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError } from "../../../../shared/errors/app-error.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.js";
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
      listar: vi.fn().mockResolvedValue([]),
      listarVigentesPorAlumno: vi.fn(),
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
    profesores: { buscarPorId: vi.fn(), buscarPorUsuario: vi.fn().mockResolvedValue({ id_profesora: 3 }) },
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

const PROPIETARIA: Solicitante = { idUsuario: 1, esPropietaria: true };
const PROFESORA: Solicitante = { idUsuario: 2, esPropietaria: false };

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

  describe("lo que ve cada uno (US-10)", () => {
    it("listar no restringe a la propietaria", async () => {
      await servicio.listar({ id_plan: 1 }, PROPIETARIA);

      expect(mocks.repositorio.listar).toHaveBeenCalledWith({ id_plan: 1 });
      expect(mocks.profesores.buscarPorUsuario).not.toHaveBeenCalled();
    });

    it("listar le deja a la profesora solo las inscripciones a su cargo", async () => {
      await servicio.listar({ id_plan: 1 }, PROFESORA);

      expect(mocks.profesores.buscarPorUsuario).toHaveBeenCalledWith(2);
      expect(mocks.repositorio.listar).toHaveBeenCalledWith({ id_plan: 1, id_profesora: 3 });
    });

    it("listar no devuelve nada si la profesora filtra por otra o si no tiene perfil activo", async () => {
      await expect(servicio.listar({ id_profesora: 9 }, PROFESORA)).resolves.toEqual([]);
      mocks.profesores.buscarPorUsuario.mockResolvedValue(null);
      await expect(servicio.listar({}, PROFESORA)).resolves.toEqual([]);
      expect(mocks.repositorio.listar).not.toHaveBeenCalled();
    });

    it("obtenerPara devuelve la inscripción a la propietaria y a la profesora a cargo", async () => {
      mocks.repositorio.buscarPorId.mockResolvedValue({ ...inscripcionActiva, id_profesora: 3 });

      await expect(servicio.obtenerPara(12, PROPIETARIA)).resolves.toMatchObject({ id_inscripcion: 12 });
      await expect(servicio.obtenerPara(12, PROFESORA)).resolves.toMatchObject({ id_inscripcion: 12 });
    });

    it("obtenerPara lanza ForbiddenError si la profesora no está a cargo", async () => {
      mocks.repositorio.buscarPorId.mockResolvedValue({ ...inscripcionActiva, id_profesora: 9 });

      await expect(servicio.obtenerPara(12, PROFESORA)).rejects.toThrow(ForbiddenError);
    });

    it("listarVigentesDeAlumno pide al repositorio las vigentes del alumno", async () => {
      mocks.repositorio.listarVigentesPorAlumno.mockResolvedValue([inscripcionActiva]);

      await expect(servicio.listarVigentesDeAlumno(5)).resolves.toEqual([inscripcionActiva]);
      expect(mocks.repositorio.listarVigentesPorAlumno).toHaveBeenCalledWith(5);
    });
  });
});
