import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import { GestionInscripcionesYClasesService } from "../gestion-inscripciones-y-clases.service.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { InscripcionService } from "../inscripcion/inscripcion.service.js";

const solicitante: Solicitante = { idUsuario: 1, esPropietaria: true };
const cambios = { id_plan: 2, id_profesora: 3, ids_horarios: [8], sin_cargo: false };

describe("GestionInscripcionesYClasesService", () => {
  const inscripciones = {
    crear: vi.fn().mockResolvedValue("inscripciones.crear"),
    listar: vi.fn().mockResolvedValue("inscripciones.listar"),
    obtenerPara: vi.fn().mockResolvedValue("inscripciones.obtenerPara"),
    darDeBajaAlumno: vi.fn().mockResolvedValue("inscripciones.darDeBajaAlumno"),
    reactivarAlumno: vi.fn().mockResolvedValue("inscripciones.reactivarAlumno"),
    cambiarPlan: vi.fn().mockResolvedValue("inscripciones.cambiarPlan"),
    actualizarHorarios: vi.fn().mockResolvedValue("inscripciones.actualizarHorarios"),
  };
  const cuotas = { tuvoPagoConfirmado: vi.fn() };
  const gestion = new GestionInscripcionesYClasesService(
    inscripciones as unknown as InscripcionService,
    cuotas as unknown as IInfoCuotas,
  );

  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["crearInscripcion", [{ id_alumno: 5, ...cambios }, solicitante], "crear"],
    ["listarInscripciones", [{ id_plan: 1 }, solicitante], "listar"],
    ["obtenerInscripcion", [12, solicitante], "obtenerPara"],
    ["darDeBajaAlumno", [5, { motivo_baja: "ABANDONO" }], "darDeBajaAlumno"],
    ["cambiarPlan", [12, cambios], "cambiarPlan"],
    ["actualizarHorarios", [12, { ids_horarios: [8] }], "actualizarHorarios"],
  ] as const)("%s se delega en Inscripcion", async (metodo, argumentos, destino) => {
    const llamar = gestion[metodo] as (...args: unknown[]) => Promise<unknown>;

    await expect(llamar.apply(gestion, [...argumentos])).resolves.toBe(`inscripciones.${destino}`);
    expect(inscripciones[destino]).toHaveBeenCalledWith(...argumentos);
  });

  it.each([
    [true, "ACTIVA"],
    [false, "PREINSCRIPTA"],
  ] as const)(
    "reactivarAlumno con tuvoPagoConfirmado %s reactiva con la inscripción %s (US-07)",
    async (yaPago, estado) => {
      cuotas.tuvoPagoConfirmado.mockResolvedValue(yaPago);

      await expect(gestion.reactivarAlumno(5, cambios)).resolves.toBe("inscripciones.reactivarAlumno");
      expect(cuotas.tuvoPagoConfirmado).toHaveBeenCalledWith(5);
      expect(inscripciones.reactivarAlumno).toHaveBeenCalledWith(5, cambios, estado);
    },
  );
});
