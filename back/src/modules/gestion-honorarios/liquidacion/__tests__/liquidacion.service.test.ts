import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error.js";
import { LiquidacionService } from "../liquidacion.service.js";
import type { LiquidacionConProfesora, LiquidacionDetallada } from "../liquidacion.types.js";

function dia(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

const PERIODO = { periodo: "2026-10", desde: dia("2026-10-01"), hasta: dia("2026-10-31") };

function inscripcion(id: number, estado: "ACTIVA" | "BAJA", idProfesora = 10) {
  return {
    id_inscripcion: id,
    id_alumno: id,
    id_profesora: idProfesora,
    id_plan: 1,
    sin_cargo: false,
    estado,
    fecha_inicio: dia("2026-09-01"),
    fecha_baja: null,
  };
}

function liquidacion(idProfesora: number, monto: number): LiquidacionConProfesora {
  return {
    id_liquidacion: idProfesora,
    id_profesora: idProfesora,
    periodo_desde: PERIODO.desde,
    periodo_hasta: PERIODO.hasta,
    fecha_liquidacion: new Date("2026-10-20T15:00:00Z"),
    monto_total: monto,
    estado: "BORRADOR",
    profesora: { id_profesora: idProfesora, usuario: { nombre: "Ana", apellido: "Paz" } },
  };
}

function detallada(estado: "BORRADOR" | "CERRADA" | "PAGADA"): LiquidacionDetallada {
  return { ...liquidacion(10, 5000), estado, detalles: [] };
}

const repositorio = {
  guardarBorradores: vi.fn(),
  listarPorPeriodo: vi.fn(),
  buscarPorId: vi.fn(),
  transicionar: vi.fn(),
};
const tarifas = { listar: vi.fn() };
const calculador = { calcular: vi.fn() };
const inscripciones = { aCargoEnPeriodo: vi.fn() };
const clases = { listarSuplidasEnPeriodo: vi.fn() };
const cuotas = { cobradoEnPeriodo: vi.fn() };
const profesoras = { listar: vi.fn() };

describe("LiquidacionService", () => {
  let service: LiquidacionService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));
    service = new LiquidacionService(
      repositorio as never,
      tarifas as never,
      calculador as never,
      inscripciones as never,
      clases as never,
      cuotas as never,
      profesoras as never,
    );
    tarifas.listar.mockResolvedValue([]);
    clases.listarSuplidasEnPeriodo.mockResolvedValue([]);
    profesoras.listar.mockResolvedValue([]);
    calculador.calcular.mockReturnValue({
      detalles: [],
      advertencias: [],
      totalesPorProfesora: new Map(),
    });
    repositorio.guardarBorradores.mockResolvedValue({ liquidaciones: [], sin_recalcular: [] });
  });

  describe("generar", () => {
    it("liquida a cada profesora, con 0 a la que no tuvo movimientos y también a la de baja que sí", async () => {
      inscripciones.aCargoEnPeriodo.mockResolvedValue([
        inscripcion(1, "ACTIVA"),
        inscripcion(2, "BAJA"),
        inscripcion(3, "BAJA", 11),
      ]);
      cuotas.cobradoEnPeriodo
        .mockResolvedValueOnce(
          new Map([
            [2, 5000],
            [3, 0],
          ]),
        )
        .mockResolvedValueOnce(
          new Map([
            [1, 8000],
            [2, 5000],
          ]),
        );
      profesoras.listar.mockResolvedValue([{ id_profesora: 10 }, { id_profesora: 11 }]);
      const advertencia = {
        id_profesora: 10,
        concepto: "ALUMNO_A_CARGO",
        motivo: "SIN_TARIFA",
        id_inscripcion: 2,
        id_clase: null,
        fecha: PERIODO.hasta,
      };
      calculador.calcular.mockReturnValue({
        detalles: [
          {
            id_profesora: 10,
            concepto: "ALUMNO_A_CARGO",
            id_tarifa: 3,
            id_inscripcion: 1,
            id_clase: null,
            monto: 7000,
          },
          {
            id_profesora: 12,
            concepto: "DESCUENTO_AUSENCIA",
            id_tarifa: 4,
            id_inscripcion: null,
            id_clase: 9,
            monto: -500,
          },
        ],
        advertencias: [advertencia],
        totalesPorProfesora: new Map([
          [10, 7000],
          [12, -500],
        ]),
      });
      repositorio.guardarBorradores.mockResolvedValue({
        liquidaciones: [liquidacion(10, 7000), liquidacion(11, 0), liquidacion(12, -500)],
        sin_recalcular: [11],
      });

      const resultado = await service.generar(PERIODO);

      // La baja 3 nunca cobró nada: no llega al calculador. Los cobros de las bajas se miran sin límite de fecha.
      expect(cuotas.cobradoEnPeriodo).toHaveBeenNthCalledWith(1, [2, 3], dia("2000-01-01"), PERIODO.hasta);
      expect(cuotas.cobradoEnPeriodo).toHaveBeenNthCalledWith(2, [1, 2], PERIODO.desde, PERIODO.hasta);
      expect(calculador.calcular).toHaveBeenCalledWith({
        finDelPeriodo: PERIODO.hasta,
        inscripciones: [inscripcion(1, "ACTIVA"), inscripcion(2, "BAJA")],
        cobradoEnElPeriodo: new Map([
          [1, 8000],
          [2, 5000],
        ]),
        suplencias: [],
        tarifas: [],
      });
      expect(repositorio.guardarBorradores).toHaveBeenCalledWith(PERIODO.desde, PERIODO.hasta, [
        {
          id_profesora: 10,
          monto_total: 7000,
          detalles: [
            { concepto: "ALUMNO_A_CARGO", id_tarifa: 3, id_inscripcion: 1, id_clase: null, monto: 7000 },
          ],
        },
        { id_profesora: 11, monto_total: 0, detalles: [] },
        {
          id_profesora: 12,
          monto_total: -500,
          detalles: [
            { concepto: "DESCUENTO_AUSENCIA", id_tarifa: 4, id_inscripcion: null, id_clase: 9, monto: -500 },
          ],
        },
      ]);
      expect(resultado).toEqual({
        periodo: "2026-10",
        total_general: 6500,
        liquidaciones: [liquidacion(10, 7000), liquidacion(11, 0), liquidacion(12, -500)],
        advertencias: [advertencia],
        sin_recalcular: [11],
      });
    });

    it("sin bajas no consulta lo cobrado más que una vez", async () => {
      inscripciones.aCargoEnPeriodo.mockResolvedValue([inscripcion(1, "ACTIVA")]);
      cuotas.cobradoEnPeriodo.mockResolvedValue(new Map([[1, 8000]]));

      await service.generar(PERIODO);

      expect(cuotas.cobradoEnPeriodo).toHaveBeenCalledTimes(1);
      expect(cuotas.cobradoEnPeriodo).toHaveBeenCalledWith([1], PERIODO.desde, PERIODO.hasta);
    });

    it("descarta una baja que no figura entre lo cobrado", async () => {
      inscripciones.aCargoEnPeriodo.mockResolvedValue([inscripcion(2, "BAJA")]);
      cuotas.cobradoEnPeriodo.mockResolvedValue(new Map());

      await service.generar(PERIODO);

      expect(calculador.calcular).toHaveBeenCalledWith(expect.objectContaining({ inscripciones: [] }));
    });

    it("le pasa al calculador las suplencias y las tarifas", async () => {
      inscripciones.aCargoEnPeriodo.mockResolvedValue([]);
      cuotas.cobradoEnPeriodo.mockResolvedValue(new Map());
      clases.listarSuplidasEnPeriodo.mockResolvedValue([{ id_clase: 9 }]);
      tarifas.listar.mockResolvedValue([{ id_tarifa: 3 }]);

      await service.generar(PERIODO);

      expect(tarifas.listar).toHaveBeenCalledWith({});
      expect(clases.listarSuplidasEnPeriodo).toHaveBeenCalledWith(PERIODO.desde, PERIODO.hasta);
      expect(calculador.calcular).toHaveBeenCalledWith(
        expect.objectContaining({ suplencias: [{ id_clase: 9 }], tarifas: [{ id_tarifa: 3 }] }),
      );
    });

    it("no guarda nada si el total del calculador no es la suma de los detalles de la profesora", async () => {
      inscripciones.aCargoEnPeriodo.mockResolvedValue([]);
      cuotas.cobradoEnPeriodo.mockResolvedValue(new Map());
      calculador.calcular.mockReturnValue({
        detalles: [
          {
            id_profesora: 10,
            concepto: "ALUMNO_A_CARGO",
            id_tarifa: 3,
            id_inscripcion: 1,
            id_clase: null,
            monto: 7000,
          },
        ],
        advertencias: [],
        totalesPorProfesora: new Map([[10, 8000]]),
      });

      await expect(service.generar(PERIODO)).rejects.toThrow(
        "El total de la liquidación de la profesora 10 no coincide con la suma de sus detalles",
      );
      expect(repositorio.guardarBorradores).not.toHaveBeenCalled();
    });

    it("rechaza un período que todavía no empezó, sin consultar nada", async () => {
      const proximo = { periodo: "2026-11", desde: dia("2026-11-01"), hasta: dia("2026-11-30") };

      await expect(service.generar(proximo)).rejects.toThrow(ValidationError);
      expect(inscripciones.aCargoEnPeriodo).not.toHaveBeenCalled();
    });

    it("permite liquidar el mes en curso", async () => {
      inscripciones.aCargoEnPeriodo.mockResolvedValue([]);
      cuotas.cobradoEnPeriodo.mockResolvedValue(new Map());

      await expect(service.generar(PERIODO)).resolves.toMatchObject({ periodo: "2026-10" });
    });
  });

  describe("listar", () => {
    it("devuelve las liquidaciones del mes con el total general", async () => {
      repositorio.listarPorPeriodo.mockResolvedValue([liquidacion(10, 0.1), liquidacion(11, 0.2)]);

      const resumen = await service.listar(PERIODO);

      expect(repositorio.listarPorPeriodo).toHaveBeenCalledWith(PERIODO.desde, PERIODO.hasta);
      expect(resumen).toEqual({
        periodo: "2026-10",
        total_general: 0.3,
        liquidaciones: [liquidacion(10, 0.1), liquidacion(11, 0.2)],
      });
    });
  });

  describe("obtener", () => {
    it("devuelve la liquidación con su detalle", async () => {
      repositorio.buscarPorId.mockResolvedValue(detallada("BORRADOR"));

      expect(await service.obtener(10)).toEqual(detallada("BORRADOR"));
    });

    it("responde 404 si no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(service.obtener(99)).rejects.toThrow(NotFoundError);
    });
  });

  describe.each<[string, "cerrar" | "pagar", "BORRADOR" | "CERRADA", "CERRADA" | "PAGADA"]>([
    ["cerrar", "cerrar", "BORRADOR", "CERRADA"],
    ["pagar", "pagar", "CERRADA", "PAGADA"],
  ])("%s", (_nombre, operacion, desde, hacia) => {
    it(`pasa de ${desde} a ${hacia} y devuelve la liquidación actualizada`, async () => {
      repositorio.buscarPorId.mockResolvedValueOnce(detallada(desde)).mockResolvedValueOnce(detallada(hacia));
      repositorio.transicionar.mockResolvedValue(true);

      const resultado = await service[operacion](10);

      expect(repositorio.transicionar).toHaveBeenCalledWith(10, desde, hacia);
      expect(resultado.estado).toBe(hacia);
    });

    it.each(["BORRADOR", "CERRADA", "PAGADA"] as const)(
      "no se puede si la liquidación está %s, salvo en el estado de origen",
      async (estado) => {
        if (estado === desde) return;
        repositorio.buscarPorId.mockResolvedValue(detallada(estado));

        await expect(service[operacion](10)).rejects.toThrow(ConflictError);
        expect(repositorio.transicionar).not.toHaveBeenCalled();
      },
    );

    it("responde 409 si otro pedido la cambió de estado mientras tanto", async () => {
      repositorio.buscarPorId.mockResolvedValue(detallada(desde));
      repositorio.transicionar.mockResolvedValue(false);

      await expect(service[operacion](10)).rejects.toThrow(ConflictError);
    });

    it("responde 404 si no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(service[operacion](99)).rejects.toThrow(NotFoundError);
    });
  });
});
