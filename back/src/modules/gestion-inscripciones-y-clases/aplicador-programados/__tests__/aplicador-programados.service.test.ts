import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IInfoCuotas } from "../../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoHorarios } from "../../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { IInfoInscripciones } from "../../inscripcion/interface/i-info-inscripciones.js";
import { AplicadorProgramadosService } from "../aplicador-programados.service.js";

// 10:00 del 9 de octubre en Argentina.
const AHORA = new Date("2026-10-09T13:00:00Z");
const HOY = new Date("2026-10-09T00:00:00Z");
const CAMBIO = { id_inscripcion: 12 };
const habilitacion = (estado: string) => ({ estado });

function crearMocks() {
  return {
    inscripciones: {
      listarCambiosParaAplicar: vi.fn().mockResolvedValue([]),
      aplicarCambioProgramado: vi.fn().mockResolvedValue(undefined),
      listarEnHorario: vi.fn().mockResolvedValue([]),
      sacarDelHorario: vi.fn().mockResolvedValue(undefined),
    },
    cuotas: { habilitacionDeInscripciones: vi.fn().mockResolvedValue(new Map()) },
    horarios: {
      listarConBajaProgramada: vi.fn().mockResolvedValue([]),
      completarBajaProgramada: vi.fn().mockResolvedValue(false),
    },
  };
}

describe("AplicadorProgramadosService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let aplicador: AplicadorProgramadosService;

  beforeEach(() => {
    mocks = crearMocks();
    aplicador = new AplicadorProgramadosService(
      mocks.inscripciones as unknown as IInfoInscripciones,
      mocks.cuotas as unknown as IInfoCuotas,
      mocks.horarios as unknown as IInfoHorarios,
    );
  });

  it("aplica los cambios de plan que vencen hasta hoy", async () => {
    mocks.inscripciones.listarCambiosParaAplicar.mockResolvedValue([CAMBIO]);

    await expect(aplicador.aplicarDelDia(AHORA)).resolves.toMatchObject({ cambiosDePlan: 1, errores: [] });
    expect(mocks.inscripciones.listarCambiosParaAplicar).toHaveBeenCalledWith(HOY);
    expect(mocks.inscripciones.aplicarCambioProgramado).toHaveBeenCalledWith(CAMBIO);
  });

  it("corre una sola vez por día", async () => {
    await aplicador.aplicarDelDia(AHORA);
    await expect(aplicador.aplicarDelDia(new Date("2026-10-09T20:00:00Z"))).resolves.toBeNull();
    await aplicador.aplicarDelDia(new Date("2026-10-10T13:00:00Z"));

    expect(mocks.inscripciones.listarCambiosParaAplicar).toHaveBeenCalledTimes(2);
  });

  it("un cambio que falla no frena a los demás y queda en los errores", async () => {
    const error = new Error("sin cupo");
    mocks.inscripciones.listarCambiosParaAplicar.mockResolvedValue([CAMBIO, { id_inscripcion: 13 }]);
    mocks.inscripciones.aplicarCambioProgramado.mockRejectedValueOnce(error);

    await expect(aplicador.aplicarDelDia(AHORA)).resolves.toMatchObject({
      cambiosDePlan: 1,
      errores: [error],
    });
  });

  it("de un horario con la baja programada sale quien terminó su gracia o no pagó; sigue quien tiene la cuota corriendo", async () => {
    mocks.horarios.listarConBajaProgramada.mockResolvedValue([{ id_horario: 8 }]);
    const alDia = { id_inscripcion: 1, id_alumno: 1, estado: "ACTIVA" };
    const enGracia = { id_inscripcion: 2, id_alumno: 2, estado: "ACTIVA" };
    const vencida = { id_inscripcion: 3, id_alumno: 3, estado: "ACTIVA" };
    const sinCuota = { id_inscripcion: 4, id_alumno: 4, estado: "ACTIVA" };
    const preinscripta = { id_inscripcion: 5, id_alumno: 5, estado: "PREINSCRIPTA" };
    mocks.inscripciones.listarEnHorario.mockResolvedValue([alDia, enGracia, vencida, sinCuota, preinscripta]);
    mocks.cuotas.habilitacionDeInscripciones.mockResolvedValue(
      new Map([
        [1, habilitacion("AL_DIA")],
        [2, habilitacion("POR_VENCER")],
        [3, habilitacion("VENCIDA")],
        [5, habilitacion("AL_DIA")],
      ]),
    );

    await expect(aplicador.aplicarDelDia(AHORA)).resolves.toMatchObject({ salidasDeHorario: 3 });
    expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([1, 2, 3, 4, 5]);
    expect(mocks.inscripciones.sacarDelHorario.mock.calls.map(([inscripcion]) => inscripcion)).toEqual([
      vencida,
      sinCuota,
      preinscripta,
    ]);
    expect(mocks.inscripciones.sacarDelHorario).toHaveBeenCalledWith(vencida, 8);
  });

  it("da de baja el horario cuando ya no queda nadie y cuenta los errores de cada salida", async () => {
    const error = new Error("no se pudo");
    mocks.horarios.listarConBajaProgramada.mockResolvedValue([{ id_horario: 8 }]);
    mocks.inscripciones.listarEnHorario.mockResolvedValue([
      { id_inscripcion: 3, id_alumno: 3, estado: "ACTIVA" },
    ]);
    mocks.inscripciones.sacarDelHorario.mockRejectedValue(error);
    mocks.horarios.completarBajaProgramada.mockResolvedValue(true);

    await expect(aplicador.aplicarDelDia(AHORA)).resolves.toMatchObject({
      salidasDeHorario: 0,
      horariosDadosDeBaja: 1,
      errores: [error],
    });
    expect(mocks.horarios.completarBajaProgramada).toHaveBeenCalledWith(8);
  });

  it("sin fecha usa el momento actual", async () => {
    await expect(aplicador.aplicarDelDia()).resolves.not.toBeNull();
  });
});
