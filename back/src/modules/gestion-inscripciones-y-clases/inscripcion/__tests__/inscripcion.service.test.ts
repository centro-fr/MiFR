import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../../shared/db/transaccion.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.types.js";
import type { IInfoProgreso } from "../../../gestion-rutinas-y-progreso/registro-progreso/interface/i-info-progreso.js";
import type { IInfoAlumnos } from "../../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoProfesores } from "../../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { IInfoHorarios } from "../../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { IInfoPlanes } from "../../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type { InscripcionRepository } from "../inscripcion.repository.js";
import type { CrearInscripcionInput, ReactivarAlumnoInput } from "../inscripcion.schemas.js";
import { InscripcionService } from "../inscripcion.service.js";
import type { InscripcionConDatos } from "../inscripcion.types.js";

const PROPIETARIA: Solicitante = { idUsuario: 1, esPropietaria: true };
const PROFESORA: Solicitante = { idUsuario: 2, esPropietaria: false };

// 15:00 UTC del 9 de octubre: en Argentina también es el 9.
const AHORA = new Date("2026-10-09T15:00:00Z");
const HOY = new Date("2026-10-09T00:00:00Z");

const plan = {
  id_plan: 1,
  tipo: "MENSUAL",
  clases_por_semana: 2,
  profesora_unica: false,
  id_actividad_exclusiva: null,
  fecha_baja: null,
};
const horario = {
  id_horario: 8,
  id_profesora: 3,
  id_actividad: 4,
  fecha_baja: null,
  actividad: { activo: true, nombre: "Funcional", requiere_medidas: false },
};
const horarioQuePideMedidas = {
  ...horario,
  actividad: { activo: true, nombre: "Entrenamiento personalizado", requiere_medidas: true },
};
const medidas = { peso_kg: 62.5, talla_cm: 168 };
const inscripcion = {
  id_inscripcion: 12,
  id_alumno: 5,
  id_plan: 1,
  id_profesora: 3,
  estado: "ACTIVA",
  plan,
} as unknown as InscripcionConDatos;
const preinscripta = { ...inscripcion, estado: "PREINSCRIPTA" } as InscripcionConDatos;
const ok = { resultado: "ok", inscripcion };
const alta: CrearInscripcionInput = {
  id_alumno: 5,
  id_plan: 1,
  id_profesora: 3,
  ids_horarios: [8],
  sin_cargo: false,
};
const reactivacion: ReactivarAlumnoInput = {
  id_plan: 1,
  id_profesora: 3,
  ids_horarios: [8],
  sin_cargo: false,
};

function crearMocks() {
  return {
    repositorio: {
      crear: vi.fn().mockResolvedValue(ok),
      listar: vi.fn().mockResolvedValue([]),
      listarVigentesPorAlumno: vi.fn(),
      buscarPorId: vi.fn().mockResolvedValue(inscripcion),
      buscarParaCobro: vi.fn(),
      buscarVigentePorAlumno: vi.fn().mockResolvedValue(null),
      activar: vi.fn().mockResolvedValue(ok),
      darDeBajaAlumno: vi.fn(),
      reactivar: vi.fn().mockResolvedValue(ok),
      cambiarPlan: vi.fn().mockResolvedValue(ok),
      actualizarHorarios: vi.fn().mockResolvedValue(ok),
      obtenerIdsDeAlumnos: vi.fn().mockResolvedValue([5]),
      resumirInscripcionesVigentes: vi.fn().mockResolvedValue([]),
      contarInscriptosVigentes: vi.fn().mockResolvedValue(new Map([[8, 2]])),
    },
    alumnos: {
      buscarPorId: vi.fn().mockResolvedValue({ id_alumno: 5, estado: "INACTIVO" }),
      activar: vi.fn(),
      darDeBaja: vi.fn(),
      reactivar: vi.fn(),
    },
    planes: {
      buscarPorId: vi.fn().mockResolvedValue(plan),
      precioVigente: vi.fn().mockResolvedValue({ id_plan_precio: 15 }),
    },
    horarios: { buscarPorIds: vi.fn().mockResolvedValue([horario]) },
    profesores: {
      buscarPorId: vi.fn().mockResolvedValue({ id_profesora: 3 }),
      buscarPorUsuario: vi.fn().mockResolvedValue({ id_profesora: 3 }),
    },
    progreso: { registrarMedicionInicial: vi.fn().mockResolvedValue(undefined) },
    // Corre la operación como lo haría la transacción, y deja ver qué quedó adentro.
    unidadDeTrabajo: { ejecutar: vi.fn((operacion: () => Promise<unknown>) => operacion()) },
  };
}

describe("InscripcionService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: InscripcionService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    mocks = crearMocks();
    servicio = new InscripcionService(
      mocks.repositorio as unknown as InscripcionRepository,
      mocks.alumnos as unknown as IInfoAlumnos,
      mocks.planes as unknown as IInfoPlanes,
      mocks.horarios as unknown as IInfoHorarios,
      mocks.profesores as unknown as IInfoProfesores,
      mocks.progreso as unknown as IInfoProgreso,
      mocks.unidadDeTrabajo as unknown as IUnidadDeTrabajo,
    );
  });

  afterEach(() => vi.useRealTimers());

  describe("crear", () => {
    it("pre-inscribe con el precio vigente hoy y los horarios elegidos", async () => {
      await expect(servicio.crear(alta, PROPIETARIA)).resolves.toBe(inscripcion);

      expect(mocks.planes.precioVigente).toHaveBeenCalledWith(1, HOY);
      expect(mocks.repositorio.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          id_alumno: 5,
          estado: "PREINSCRIPTA",
          id_plan_precio: 15,
          fecha_inicio: HOY,
        }),
        [8],
        HOY,
      );
    });

    it.each([
      ["el alumno no existe", () => mocks.alumnos.buscarPorId.mockResolvedValue(null), NotFoundError],
      [
        "el alumno está dado de baja",
        () => mocks.alumnos.buscarPorId.mockResolvedValue({ id_alumno: 5, estado: "BAJA" }),
        NotFoundError,
      ],
      ["el plan no existe", () => mocks.planes.buscarPorId.mockResolvedValue(null), ConflictError],
      [
        "el plan está dado de baja",
        () => mocks.planes.buscarPorId.mockResolvedValue({ ...plan, fecha_baja: HOY }),
        ConflictError,
      ],
      [
        "el plan no tiene precio vigente",
        () => mocks.planes.precioVigente.mockResolvedValue(null),
        ConflictError,
      ],
    ] as const)("rechaza si %s", async (_caso, preparar, error) => {
      preparar();

      await expect(servicio.crear(alta, PROPIETARIA)).rejects.toThrow(error);
      expect(mocks.repositorio.crear).not.toHaveBeenCalled();
    });

    describe("peso y talla (US-05)", () => {
      it("si una actividad de los horarios los pide y faltan, rechaza sin guardar nada", async () => {
        mocks.horarios.buscarPorIds.mockResolvedValue([horario, { ...horarioQuePideMedidas, id_horario: 9 }]);

        await expect(servicio.crear({ ...alta, ids_horarios: [8, 9] }, PROPIETARIA)).rejects.toThrow(
          new ValidationError("Entrenamiento personalizado pide el peso y la talla para pre-inscribir"),
        );
        expect(mocks.unidadDeTrabajo.ejecutar).not.toHaveBeenCalled();
        expect(mocks.repositorio.crear).not.toHaveBeenCalled();
      });

      it("con las medidas, guarda la inscripción y la medición inicial en la misma transacción", async () => {
        mocks.horarios.buscarPorIds.mockResolvedValue([horarioQuePideMedidas]);
        mocks.unidadDeTrabajo.ejecutar.mockImplementation(async (operacion) => {
          expect(mocks.repositorio.crear).not.toHaveBeenCalled();
          const resultado = await operacion();
          expect(mocks.progreso.registrarMedicionInicial).toHaveBeenCalled();
          return resultado;
        });

        await expect(servicio.crear({ ...alta, medidas }, PROPIETARIA)).resolves.toBe(inscripcion);
        expect(mocks.progreso.registrarMedicionInicial).toHaveBeenCalledWith({
          idAlumno: 5,
          idProfesora: 3,
          pesoKg: 62.5,
          tallaCm: 168,
        });
        expect(mocks.repositorio.crear.mock.calls[0][0]).not.toHaveProperty("medidas");
      });

      it("sin cupo no registra la medición", async () => {
        mocks.horarios.buscarPorIds.mockResolvedValue([horarioQuePideMedidas]);
        mocks.repositorio.crear.mockResolvedValue({ resultado: "sin-cupo" });

        await expect(servicio.crear({ ...alta, medidas }, PROPIETARIA)).rejects.toThrow(ConflictError);
        expect(mocks.progreso.registrarMedicionInicial).not.toHaveBeenCalled();
      });

      it("si ninguna actividad las pide, no las exige; si llegan igual, las guarda", async () => {
        await servicio.crear(alta, PROPIETARIA);
        expect(mocks.progreso.registrarMedicionInicial).not.toHaveBeenCalled();

        await servicio.crear({ ...alta, medidas }, PROPIETARIA);
        expect(mocks.progreso.registrarMedicionInicial).toHaveBeenCalledOnce();
      });
    });

    describe("pedido por una profesora", () => {
      it("pre-inscribe a su nombre un alumno que no está con otra profesora", async () => {
        mocks.repositorio.listarVigentesPorAlumno.mockResolvedValue([{ ...inscripcion, id_profesora: 3 }]);

        await expect(servicio.crear(alta, PROFESORA)).resolves.toBe(inscripcion);
        expect(mocks.profesores.buscarPorUsuario).toHaveBeenCalledWith(2);
        expect(mocks.repositorio.listarVigentesPorAlumno).toHaveBeenCalledWith(5);
      });

      it.each([
        ["a nombre de otra profesora", { ...alta, id_profesora: 9 }, "a su propio cargo"],
        [
          "sin cargo",
          { ...alta, sin_cargo: true },
          "Solo la propietaria puede dar una inscripción sin cargo",
        ],
      ])("rechaza con 403 una pre-inscripción %s", async (_caso, pedido, mensaje) => {
        mocks.repositorio.listarVigentesPorAlumno.mockResolvedValue([]);

        await expect(servicio.crear(pedido, PROFESORA)).rejects.toThrow(mensaje);
        expect(mocks.repositorio.crear).not.toHaveBeenCalled();
      });

      it("rechaza con 403 si quien pide no tiene un perfil de profesora activo", async () => {
        mocks.profesores.buscarPorUsuario.mockResolvedValue(null);

        await expect(servicio.crear(alta, PROFESORA)).rejects.toBeInstanceOf(ForbiddenError);
        expect(mocks.repositorio.crear).not.toHaveBeenCalled();
      });

      it("rechaza con 403 un alumno que tiene una inscripción vigente con otra profesora", async () => {
        mocks.repositorio.listarVigentesPorAlumno.mockResolvedValue([{ ...inscripcion, id_profesora: 7 }]);

        await expect(servicio.crear(alta, PROFESORA)).rejects.toThrow("a cargo de otra profesora");
        expect(mocks.repositorio.crear).not.toHaveBeenCalled();
      });

      it("a la propietaria no le aplica ninguna de esas restricciones", async () => {
        await servicio.crear({ ...alta, id_profesora: 9, sin_cargo: true }, PROPIETARIA);

        expect(mocks.profesores.buscarPorUsuario).not.toHaveBeenCalled();
        expect(mocks.repositorio.listarVigentesPorAlumno).not.toHaveBeenCalled();
      });
    });

    it("rechaza un inicio anterior a hoy y un fin estimado que no es posterior al inicio", async () => {
      await expect(
        servicio.crear({ ...alta, fecha_inicio: new Date("2026-10-08T00:00:00Z") }, PROPIETARIA),
      ).rejects.toThrow(ValidationError);
      await expect(servicio.crear({ ...alta, fecha_fin_estimado: HOY }, PROPIETARIA)).rejects.toThrow(
        ValidationError,
      );
    });

    it.each([
      ["sin cupo", { resultado: "sin-cupo" }, "No hay cupo disponible"],
      ["con el plan duplicado", { resultado: "plan-duplicado" }, "ya tiene una inscripción vigente"],
      ["si dejó de estar vigente", { resultado: "no-vigente" }, "dejó de estar vigente"],
    ])("traduce el resultado del repositorio %s a ConflictError", async (_caso, resultado, mensaje) => {
      mocks.repositorio.crear.mockResolvedValue(resultado);

      await expect(servicio.crear(alta, PROPIETARIA)).rejects.toThrow(mensaje);
    });
  });

  describe("reglas de los horarios", () => {
    it.each([
      [
        "la profesora no existe o está inactiva",
        () => mocks.profesores.buscarPorId.mockResolvedValue(null),
        NotFoundError,
      ],
      ["falta un horario", () => mocks.horarios.buscarPorIds.mockResolvedValue([]), ConflictError],
      [
        "un horario está dado de baja",
        () => mocks.horarios.buscarPorIds.mockResolvedValue([{ ...horario, fecha_baja: HOY }]),
        ConflictError,
      ],
      [
        "la actividad del horario está dada de baja",
        () => mocks.horarios.buscarPorIds.mockResolvedValue([{ ...horario, actividad: { activo: false } }]),
        ConflictError,
      ],
    ] as const)("rechaza si %s", async (_caso, preparar, error) => {
      preparar();

      await expect(servicio.crear(alta, PROPIETARIA)).rejects.toThrow(error);
    });

    it("rechaza horarios de dos profesoras distintas", async () => {
      mocks.horarios.buscarPorIds.mockResolvedValue([
        horario,
        { ...horario, id_horario: 9, id_profesora: 4 },
      ]);

      await expect(servicio.crear({ ...alta, ids_horarios: [8, 9] }, PROPIETARIA)).rejects.toThrow(
        "misma profesora",
      );
    });

    it("con profesora única exige que los horarios sean de la profesora a cargo", async () => {
      mocks.planes.buscarPorId.mockResolvedValue({ ...plan, profesora_unica: true });

      await expect(servicio.crear({ ...alta, id_profesora: 7 }, PROPIETARIA)).rejects.toThrow(
        ValidationError,
      );
    });

    it("con actividad exclusiva exige horarios de esa actividad", async () => {
      mocks.planes.buscarPorId.mockResolvedValue({ ...plan, id_actividad_exclusiva: 99 });

      await expect(servicio.crear(alta, PROPIETARIA)).rejects.toThrow("actividad exclusiva");
    });

    it("en un plan mensual no acepta más horarios que clases por semana", async () => {
      mocks.planes.buscarPorId.mockResolvedValue({ ...plan, clases_por_semana: 1 });
      mocks.horarios.buscarPorIds.mockResolvedValue([horario, { ...horario, id_horario: 9 }]);

      await expect(servicio.crear({ ...alta, ids_horarios: [8, 9] }, PROPIETARIA)).rejects.toThrow(
        "clases por semana",
      );
    });

    it("un mensual sin clases por semana es un pase libre y acepta varios horarios", async () => {
      mocks.planes.buscarPorId.mockResolvedValue({ ...plan, clases_por_semana: null });
      mocks.horarios.buscarPorIds.mockResolvedValue([horario, { ...horario, id_horario: 9 }]);

      await expect(servicio.crear({ ...alta, ids_horarios: [8, 9] }, PROPIETARIA)).resolves.toBe(inscripcion);
    });

    it("una clase suelta no tiene tope de horarios", async () => {
      mocks.planes.buscarPorId.mockResolvedValue({ ...plan, tipo: "CLASE_SUELTA", clases_por_semana: null });

      await expect(servicio.crear(alta, PROPIETARIA)).resolves.toBe(inscripcion);
    });
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
      await expect(servicio.obtenerPara(12, PROPIETARIA)).resolves.toBe(inscripcion);
      await expect(servicio.obtenerPara(12, PROFESORA)).resolves.toBe(inscripcion);
    });

    it("obtenerPara lanza ForbiddenError si la profesora no está a cargo", async () => {
      mocks.profesores.buscarPorUsuario.mockResolvedValue({ id_profesora: 9 });

      await expect(servicio.obtenerPara(12, PROFESORA)).rejects.toThrow(ForbiddenError);
    });

    it("buscarParaCobro devuelve null si no existe, sin lanzar", async () => {
      mocks.repositorio.buscarParaCobro.mockResolvedValue(null);

      await expect(servicio.buscarParaCobro(99)).resolves.toBeNull();
      expect(mocks.repositorio.buscarParaCobro).toHaveBeenCalledWith(99);
    });

    it("obtenerPorId lanza NotFoundError si no existe", async () => {
      mocks.repositorio.buscarPorId.mockResolvedValue(null);

      await expect(servicio.obtenerPorId(99)).rejects.toThrow(NotFoundError);
    });
  });

  describe("activar (US-07)", () => {
    it("activa la pre-inscripción y el alumno", async () => {
      mocks.repositorio.buscarPorId.mockResolvedValue(preinscripta);

      await servicio.activar(12);

      expect(mocks.repositorio.activar).toHaveBeenCalledWith(12);
      expect(mocks.alumnos.activar).toHaveBeenCalledWith(5);
    });

    it("si ya estaba activa no toca la inscripción ni al alumno: el alta es la del primer pago", async () => {
      await expect(servicio.activar(12)).resolves.toBe(inscripcion);

      expect(mocks.repositorio.activar).not.toHaveBeenCalled();
      expect(mocks.alumnos.activar).not.toHaveBeenCalled();
    });

    it("rechaza una inscripción dada de baja y no activa sin cupo", async () => {
      mocks.repositorio.buscarPorId.mockResolvedValueOnce({ ...inscripcion, estado: "BAJA" });
      await expect(servicio.activar(12)).rejects.toThrow(ConflictError);

      mocks.repositorio.buscarPorId.mockResolvedValueOnce(preinscripta);
      mocks.repositorio.activar.mockResolvedValue({ resultado: "sin-cupo" });
      await expect(servicio.activar(12)).rejects.toThrow(ConflictError);
      expect(mocks.alumnos.activar).not.toHaveBeenCalled();
    });
  });

  describe("darDeBajaAlumno (US-08)", () => {
    it("cierra las inscripciones con el instante y el día de Argentina, y da de baja al alumno", async () => {
      await servicio.darDeBajaAlumno(5, { motivo_baja: "ABANDONO" });

      expect(mocks.repositorio.darDeBajaAlumno).toHaveBeenCalledWith(
        5,
        { motivo_baja: "ABANDONO" },
        { instante: AHORA, dia: HOY },
      );
      expect(mocks.alumnos.darDeBaja).toHaveBeenCalledWith(5);
    });

    it("rechaza un alumno inexistente o ya dado de baja", async () => {
      mocks.alumnos.buscarPorId.mockResolvedValueOnce(null);
      await expect(servicio.darDeBajaAlumno(5, { motivo_baja: "OTRO" })).rejects.toThrow(NotFoundError);

      mocks.alumnos.buscarPorId.mockResolvedValueOnce({ id_alumno: 5, estado: "BAJA" });
      await expect(servicio.darDeBajaAlumno(5, { motivo_baja: "OTRO" })).rejects.toThrow(ConflictError);
      expect(mocks.repositorio.darDeBajaAlumno).not.toHaveBeenCalled();
    });
  });

  describe("reactivarAlumno (US-08)", () => {
    beforeEach(() => {
      mocks.alumnos.buscarPorId.mockResolvedValue({ id_alumno: 5, estado: "BAJA" });
    });

    it("crea una inscripción nueva activa y reactiva al alumno", async () => {
      await servicio.reactivarAlumno(5, reactivacion);

      expect(mocks.repositorio.reactivar).toHaveBeenCalledWith(
        expect.objectContaining({ id_alumno: 5, id_plan_precio: 15, estado: "ACTIVA" }),
        [8],
        HOY,
      );
      expect(mocks.alumnos.reactivar).toHaveBeenCalledWith(5);
    });

    it("no cambia al alumno si no hay cupo", async () => {
      mocks.repositorio.reactivar.mockResolvedValue({ resultado: "sin-cupo" });

      await expect(servicio.reactivarAlumno(5, reactivacion)).rejects.toThrow(ConflictError);
      expect(mocks.alumnos.reactivar).not.toHaveBeenCalled();
    });

    it("no vuelve a reactivar si otra operación ya lo hizo", async () => {
      mocks.alumnos.buscarPorId
        .mockResolvedValueOnce({ id_alumno: 5, estado: "BAJA" })
        .mockResolvedValueOnce({ id_alumno: 5, estado: "BAJA" })
        .mockResolvedValueOnce({ id_alumno: 5, estado: "ACTIVO" });

      await servicio.reactivarAlumno(5, reactivacion);

      expect(mocks.alumnos.reactivar).not.toHaveBeenCalled();
    });

    it("con una inscripción activa que quedó abierta solo reactiva al alumno", async () => {
      mocks.repositorio.buscarVigentePorAlumno.mockResolvedValue(inscripcion);

      await expect(servicio.reactivarAlumno(5, reactivacion)).resolves.toBe(inscripcion);
      expect(mocks.repositorio.reactivar).not.toHaveBeenCalled();
      expect(mocks.alumnos.reactivar).toHaveBeenCalledWith(5);
    });

    it("rechaza si quedó una pre-inscripción vigente, si no existe o si no está de baja", async () => {
      mocks.repositorio.buscarVigentePorAlumno.mockResolvedValueOnce(preinscripta);
      await expect(servicio.reactivarAlumno(5, reactivacion)).rejects.toThrow(ConflictError);

      mocks.alumnos.buscarPorId.mockResolvedValueOnce(null);
      await expect(servicio.reactivarAlumno(5, reactivacion)).rejects.toThrow(NotFoundError);

      mocks.alumnos.buscarPorId.mockResolvedValueOnce({ id_alumno: 5, estado: "ACTIVO" });
      await expect(servicio.reactivarAlumno(5, reactivacion)).rejects.toThrow(ConflictError);
    });
  });

  describe("cambiarPlan y actualizarHorarios (US-09)", () => {
    it("cambiarPlan conserva el estado y usa el precio vigente del plan nuevo", async () => {
      await servicio.cambiarPlan(12, { ...reactivacion, id_plan: 2 });

      expect(mocks.planes.buscarPorId).toHaveBeenCalledWith(2);
      expect(mocks.repositorio.cambiarPlan).toHaveBeenCalledWith(
        inscripcion,
        expect.objectContaining({ id_plan: 2 }),
        15,
        { instante: AHORA, dia: HOY },
      );
    });

    it("cambiarPlan de una pre-inscripción la deja pre-inscripta", async () => {
      mocks.repositorio.buscarPorId.mockResolvedValue(preinscripta);

      await servicio.cambiarPlan(12, { ...reactivacion, id_plan: 2 });

      expect(mocks.repositorio.cambiarPlan).toHaveBeenCalled();
    });

    it("cambiarPlan rechaza el mismo plan y una inscripción dada de baja", async () => {
      await expect(servicio.cambiarPlan(12, reactivacion)).rejects.toThrow("ya tiene el plan");

      mocks.repositorio.buscarPorId.mockResolvedValue({ ...inscripcion, estado: "BAJA" });
      await expect(servicio.cambiarPlan(12, { ...reactivacion, id_plan: 2 })).rejects.toThrow("dada de baja");
      expect(mocks.repositorio.cambiarPlan).not.toHaveBeenCalled();
    });

    it("actualizarHorarios valida con las reglas del plan de la inscripción", async () => {
      await servicio.actualizarHorarios(12, { ids_horarios: [8] });

      expect(mocks.planes.buscarPorId).not.toHaveBeenCalled();
      expect(mocks.repositorio.actualizarHorarios).toHaveBeenCalledWith(
        inscripcion,
        { ids_horarios: [8] },
        HOY,
      );
    });
  });

  describe("IInfoInscripciones", () => {
    it("pasa las consultas al repositorio", async () => {
      await expect(servicio.obtenerIdsDeAlumnos({ id_plan: 1 })).resolves.toEqual([5]);
      await expect(servicio.resumirInscripcionesVigentes([5])).resolves.toEqual([]);
      await expect(servicio.contarInscriptosVigentes([8])).resolves.toEqual(new Map([[8, 2]]));
      mocks.repositorio.listarVigentesPorAlumno.mockResolvedValue([inscripcion]);
      await expect(servicio.listarVigentesDeAlumno(5)).resolves.toEqual([inscripcion]);
    });
  });
});
