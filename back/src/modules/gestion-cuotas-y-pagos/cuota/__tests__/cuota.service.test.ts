import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { ICalculoHabilitacion } from "../../../calculos-del-negocio/calculador-habilitacion/interface/i-calculo-habilitacion.js";
import type { ICalculoVencimiento } from "../../../calculos-del-negocio/calculador-vencimiento-cuota/interface/i-calculo-vencimiento.js";
import type { IInfoInscripciones } from "../../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoParametros } from "../../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoPlanes } from "../../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type { CuotaRepository } from "../cuota.repository.js";
import { CuotaService } from "../cuota.service.js";
import type { SituacionDeCuotas } from "../cuota.types.js";

// 15:00 UTC del 9 de octubre: en Argentina también es el 9.
const AHORA = new Date("2026-10-09T15:00:00Z");
const HOY = new Date("2026-10-09T00:00:00Z");
const DIA_DESPUES = new Date("2026-10-10T00:00:00Z");
const VENCIMIENTO_CALCULADO = new Date("2026-11-09T00:00:00Z");

const inscripcion = { id_inscripcion: 12, id_plan: 1, estado: "ACTIVA", alumno: { estado: "ACTIVO" } };

function situacion(
  cuotas: SituacionDeCuotas["cuotas"] = [],
  tipo_plan: "MENSUAL" | "CLASE_SUELTA" = "MENSUAL",
): SituacionDeCuotas {
  return { id_inscripcion: 12, tipo_plan, dias_gracia: 5, cuotas };
}

function cuota(
  numero_cuota: number,
  estados_pagos: SituacionDeCuotas["cuotas"][number]["estados_pagos"],
  fecha = HOY,
) {
  return { id_cuota: numero_cuota + 100, numero_cuota, fecha_vencimiento: fecha, estados_pagos };
}

function crearMocks() {
  return {
    repositorio: { situacionDeInscripciones: vi.fn().mockResolvedValue([situacion()]) },
    inscripciones: { buscarPorId: vi.fn().mockResolvedValue(inscripcion), activar: vi.fn() },
    planes: { precioVigente: vi.fn().mockResolvedValue({ precio: 30000 }) },
    vencimientos: { calcularVencimiento: vi.fn().mockReturnValue(VENCIMIENTO_CALCULADO) },
    habilitaciones: { calcular: vi.fn().mockReturnValue({ estado: "AL_DIA", puedeAsistir: true }) },
    parametros: { obtener: vi.fn().mockResolvedValue(true) },
  };
}

describe("CuotaService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: CuotaService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    mocks = crearMocks();
    servicio = new CuotaService(
      mocks.repositorio as unknown as CuotaRepository,
      mocks.inscripciones as unknown as IInfoInscripciones,
      mocks.planes as unknown as IInfoPlanes,
      mocks.vencimientos as ICalculoVencimiento,
      mocks.habilitaciones as unknown as ICalculoHabilitacion,
      mocks.parametros as unknown as IInfoParametros,
    );
  });

  afterEach(() => vi.useRealTimers());

  describe("prepararCobro", () => {
    it("la primera cuota cubre desde hoy, con el precio vigente y el vencimiento calculado", async () => {
      await expect(servicio.prepararCobro(12)).resolves.toEqual({
        inscripcion,
        idCuotaExistente: null,
        numeroCuota: 1,
        fechaVencimiento: VENCIMIENTO_CALCULADO,
        monto: 30000,
      });
      expect(mocks.planes.precioVigente).toHaveBeenCalledWith(1, HOY);
      expect(mocks.vencimientos.calcularVencimiento).toHaveBeenCalledWith({
        tipoPlan: "MENSUAL",
        desde: HOY,
      });
    });

    it("un mensual al día que paga por adelantado sigue desde donde termina su cuota vigente", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValue([
        situacion([cuota(1, ["CONFIRMADO"], DIA_DESPUES)]),
      ]);

      await expect(servicio.prepararCobro(12)).resolves.toMatchObject({
        numeroCuota: 2,
        idCuotaExistente: null,
      });
      expect(mocks.vencimientos.calcularVencimiento).toHaveBeenCalledWith({
        tipoPlan: "MENSUAL",
        desde: DIA_DESPUES,
      });
    });

    it("un vencido o una clase suelta cubren desde hoy", async () => {
      const vencida = cuota(1, ["CONFIRMADO"], new Date("2026-09-01T00:00:00Z"));
      mocks.repositorio.situacionDeInscripciones.mockResolvedValueOnce([situacion([vencida])]);
      await servicio.prepararCobro(12);

      mocks.repositorio.situacionDeInscripciones.mockResolvedValueOnce([
        situacion([cuota(1, ["CONFIRMADO"], DIA_DESPUES)], "CLASE_SUELTA"),
      ]);
      await servicio.prepararCobro(12);

      expect(mocks.vencimientos.calcularVencimiento.mock.calls.map(([datos]) => datos.desde)).toEqual([
        HOY,
        HOY,
      ]);
    });

    it("reusa la última cuota si quedó sin pagar, por ejemplo después de un rechazo", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValue([
        situacion([cuota(2, ["RECHAZADO"]), cuota(1, ["CONFIRMADO"])]),
      ]);

      await expect(servicio.prepararCobro(12)).resolves.toMatchObject({
        idCuotaExistente: 102,
        numeroCuota: 2,
      });
    });

    it("rechaza una inscripción inexistente, dada de baja o de un alumno dado de baja", async () => {
      mocks.inscripciones.buscarPorId.mockResolvedValueOnce(null);
      await expect(servicio.prepararCobro(12)).rejects.toThrow(NotFoundError);

      mocks.inscripciones.buscarPorId.mockResolvedValueOnce({ ...inscripcion, estado: "BAJA" });
      await expect(servicio.prepararCobro(12)).rejects.toThrow("dado de baja");

      mocks.inscripciones.buscarPorId.mockResolvedValueOnce({ ...inscripcion, alumno: { estado: "BAJA" } });
      await expect(servicio.prepararCobro(12)).rejects.toThrow("dado de baja");
    });

    it("rechaza si hay una transferencia pendiente de revisión o si el plan no tiene precio", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValueOnce([
        situacion([cuota(1, ["PENDIENTE"])]),
      ]);
      await expect(servicio.prepararCobro(12)).rejects.toThrow("transferencia pendiente");

      mocks.planes.precioVigente.mockResolvedValueOnce(null);
      await expect(servicio.prepararCobro(12)).rejects.toThrow(ConflictError);
    });
  });

  it("darAltaDefinitiva activa la inscripción (US-07)", async () => {
    await servicio.darAltaDefinitiva(12);

    expect(mocks.inscripciones.activar).toHaveBeenCalledWith(12);
  });

  describe("habilitacionDeInscripciones", () => {
    it("no consulta nada sin ids", async () => {
      await expect(servicio.habilitacionDeInscripciones([])).resolves.toEqual(new Map());
      expect(mocks.repositorio.situacionDeInscripciones).not.toHaveBeenCalled();
    });

    it("le pasa al cálculo el vencimiento confirmado más lejano, el pendiente y la política de vencidos", async () => {
      mocks.repositorio.situacionDeInscripciones.mockResolvedValue([
        situacion([
          cuota(3, ["PENDIENTE"], new Date("2026-12-09T00:00:00Z")),
          cuota(2, ["RECHAZADO", "CONFIRMADO"], DIA_DESPUES),
          cuota(1, ["CONFIRMADO"], HOY),
        ]),
      ]);

      const habilitaciones = await servicio.habilitacionDeInscripciones([12]);

      expect(habilitaciones.get(12)).toEqual({ estado: "AL_DIA", puedeAsistir: true });
      expect(mocks.parametros.obtener).toHaveBeenCalledWith("VENCIDOS_PUEDEN_ASISTIR");
      expect(mocks.habilitaciones.calcular).toHaveBeenCalledWith({
        tipoPlan: "MENSUAL",
        vencimiento: DIA_DESPUES,
        diasGracia: 5,
        tienePagoPendiente: true,
        vencidosPuedenAsistir: true,
        hoy: HOY,
      });
    });

    it("sin cuotas confirmadas el vencimiento es null", async () => {
      await servicio.habilitacionDeInscripciones([12]);

      expect(mocks.habilitaciones.calcular).toHaveBeenCalledWith(
        expect.objectContaining({ vencimiento: null, tienePagoPendiente: false }),
      );
    });
  });
});
