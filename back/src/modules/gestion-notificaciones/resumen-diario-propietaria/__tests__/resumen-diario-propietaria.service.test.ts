import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IInfoCuotas } from "../../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoPagos } from "../../../gestion-cuotas-y-pagos/pago/interface/i-info-pagos.js";
import type { IInfoParametros } from "../../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoUsuarios } from "../../../gestion-usuarios/usuario/interface/i-info-usuarios.js";
import type { IRegistroNotificaciones } from "../../notificacion/interface/i-registro-notificaciones.js";
import {
  armarMensajeResumen,
  ResumenDiarioPropietariaService,
} from "../resumen-diario-propietaria.service.js";

// 01:00 UTC del 17/10: en Argentina son las 22:00 del 16 (posterior a 20:00).
const AHORA = new Date("2026-10-17T01:00:00Z");
const HOY = new Date("2026-10-16T00:00:00Z");

const transferencias = {
  cantidad: 2,
  total: 60000,
  supera_24_horas: 1,
  por_superar_24_horas: 0,
  mas_antiguas: [],
};
const efectivo = { cantidad: 3, total: 75000, profesoras: [], mas_antiguo: null };
const cuotasVencidas = {
  cantidad: 1,
  cantidad_alumnos: 1,
  monto_estimado: 30000,
  sin_precio: 0,
  por_profesora: [],
  por_plan: [],
  mas_atrasadas: [],
};

function crearMocks() {
  return {
    pagos: {
      resumenTransferenciasPendientes: vi.fn().mockResolvedValue(transferencias),
      resumenEfectivoPendiente: vi.fn().mockResolvedValue(efectivo),
    },
    cuotas: { resumenCuotasVencidas: vi.fn().mockResolvedValue(cuotasVencidas) },
    parametros: {
      obtener: vi.fn().mockResolvedValue("20:00"),
    },
    usuarios: {
      listarPropietariasActivas: vi.fn().mockResolvedValue([{ id_usuario: 1 }]),
    },
    notificaciones: {
      registrarResumenDiario: vi.fn().mockResolvedValue(true),
    },
  };
}

describe("ResumenDiarioPropietariaService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: ResumenDiarioPropietariaService;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
    log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks = crearMocks();
    servicio = new ResumenDiarioPropietariaService(
      mocks.pagos as unknown as IInfoPagos,
      mocks.cuotas as unknown as IInfoCuotas,
      mocks.parametros as unknown as IInfoParametros,
      mocks.usuarios as unknown as IInfoUsuarios,
      mocks.notificaciones as unknown as IRegistroNotificaciones,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("obtener junta los tres bloques del día de Argentina", async () => {
    await expect(servicio.obtener()).resolves.toEqual({
      fecha: HOY,
      transferencias,
      efectivo,
      cuotas_vencidas: cuotasVencidas,
      bloques_con_error: [],
      sin_novedades: false,
    });
    expect(mocks.cuotas.resumenCuotasVencidas).toHaveBeenCalledWith(HOY);
    expect(log).not.toHaveBeenCalled();
  });

  it("obtener sin nada pendiente en ningún bloque está sin novedades", async () => {
    mocks.pagos.resumenTransferenciasPendientes.mockResolvedValue({ ...transferencias, cantidad: 0 });
    mocks.pagos.resumenEfectivoPendiente.mockResolvedValue({ ...efectivo, cantidad: 0 });
    mocks.cuotas.resumenCuotasVencidas.mockResolvedValue({ ...cuotasVencidas, cantidad: 0 });

    await expect(servicio.obtener()).resolves.toMatchObject({ sin_novedades: true, bloques_con_error: [] });
  });

  it.each([
    ["transferencias", "RESUMEN_DIARIO_TRANSFERENCIAS", () => mocks.pagos.resumenTransferenciasPendientes],
    ["efectivo", "RESUMEN_DIARIO_EFECTIVO", () => mocks.pagos.resumenEfectivoPendiente],
    ["cuotas_vencidas", "RESUMEN_DIARIO_CUOTAS_VENCIDAS", () => mocks.cuotas.resumenCuotasVencidas],
  ] as const)(
    "obtener con el bloque %s caído sale igual con los otros, lo marca y lo deja en el log",
    async (bloque, contexto, consulta) => {
      const error = new Error("se cayó la base");
      consulta().mockRejectedValue(error);

      const resumen = await servicio.obtener();

      expect(resumen[bloque]).toBeNull();
      expect(resumen.bloques_con_error).toEqual([bloque]);
      expect(resumen.sin_novedades).toBe(false);
      expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({ error: contexto });
      expect(log.mock.calls[0][1]).toBe(error);
    },
  );

  it("obtener sin novedades en los bloques que salieron no dice 'sin novedades' si otro falló", async () => {
    mocks.pagos.resumenTransferenciasPendientes.mockResolvedValue({ ...transferencias, cantidad: 0 });
    mocks.pagos.resumenEfectivoPendiente.mockResolvedValue({ ...efectivo, cantidad: 0 });
    mocks.cuotas.resumenCuotasVencidas.mockRejectedValue(new Error("caída"));

    await expect(servicio.obtener()).resolves.toMatchObject({
      sin_novedades: false,
      bloques_con_error: ["cuotas_vencidas"],
    });
  });

  describe("generarResumenDiario", () => {
    it("no genera si la hora actual de Argentina es anterior a HORA_RESUMEN_DIARIO", async () => {
      // 18:00 UTC = 15:00 en Argentina, menor que 20:00
      vi.setSystemTime(new Date("2026-10-16T18:00:00Z"));

      await expect(servicio.generarResumenDiario()).resolves.toBe(0);
      expect(mocks.notificaciones.registrarResumenDiario).not.toHaveBeenCalled();
    });

    it("no genera si no hay propietarias activas", async () => {
      mocks.usuarios.listarPropietariasActivas.mockResolvedValue([]);

      await expect(servicio.generarResumenDiario()).resolves.toBe(0);
      expect(mocks.notificaciones.registrarResumenDiario).not.toHaveBeenCalled();
    });

    it("genera y registra la notificación diaria con los pendientes", async () => {
      await expect(servicio.generarResumenDiario()).resolves.toBe(1);

      expect(mocks.notificaciones.registrarResumenDiario).toHaveBeenCalledWith(
        1,
        "Resumen diario: 2 transferencias por confirmar ($60000), 3 cobros en efectivo sin rendir ($75000), 1 alumno con cuotas vencidas ($30000).",
        AHORA,
        HOY,
      );
    });

    it("genera 'Todo al día' cuando no hay pendientes", async () => {
      mocks.pagos.resumenTransferenciasPendientes.mockResolvedValue({ ...transferencias, cantidad: 0 });
      mocks.pagos.resumenEfectivoPendiente.mockResolvedValue({ ...efectivo, cantidad: 0 });
      mocks.cuotas.resumenCuotasVencidas.mockResolvedValue({
        ...cuotasVencidas,
        cantidad_alumnos: 0,
        cantidad: 0,
      });

      await expect(servicio.generarResumenDiario()).resolves.toBe(1);

      expect(mocks.notificaciones.registrarResumenDiario).toHaveBeenCalledWith(1, "Todo al día", AHORA, HOY);
    });

    it("no duplica en el mismo día si se vuelve a llamar", async () => {
      await expect(servicio.generarResumenDiario()).resolves.toBe(1);
      expect(mocks.notificaciones.registrarResumenDiario).toHaveBeenCalledTimes(1);

      // Segunda llamada el mismo día
      await expect(servicio.generarResumenDiario()).resolves.toBe(0);
      expect(mocks.notificaciones.registrarResumenDiario).toHaveBeenCalledTimes(1);
    });

    it("registra para múltiples propietarias activas", async () => {
      mocks.usuarios.listarPropietariasActivas.mockResolvedValue([{ id_usuario: 1 }, { id_usuario: 2 }]);

      await expect(servicio.generarResumenDiario()).resolves.toBe(2);
      expect(mocks.notificaciones.registrarResumenDiario).toHaveBeenCalledTimes(2);
    });

    it("si ya existía en la base para una propietaria, no suma a las guardadas", async () => {
      mocks.notificaciones.registrarResumenDiario.mockResolvedValue(false);

      await expect(servicio.generarResumenDiario()).resolves.toBe(0);
    });
  });

  describe("armarMensajeResumen", () => {
    it("devuelve 'Todo al día' cuando sin_novedades es true", () => {
      expect(
        armarMensajeResumen({
          fecha: HOY,
          sin_novedades: true,
          bloques_con_error: [],
          transferencias: null,
          efectivo: null,
          cuotas_vencidas: null,
        }),
      ).toBe("Todo al día");
    });

    it("devuelve 'Todo al día' cuando sin_novedades es false pero las partes quedan vacías", () => {
      expect(
        armarMensajeResumen({
          fecha: HOY,
          sin_novedades: false,
          bloques_con_error: ["transferencias"],
          transferencias: null,
          efectivo: { cantidad: 0, total: 0, profesoras: [], mas_antiguo: null },
          cuotas_vencidas: {
            cantidad: 0,
            cantidad_alumnos: 0,
            monto_estimado: 0,
            sin_precio: 0,
            por_profesora: [],
            por_plan: [],
            mas_atrasadas: [],
          },
        }),
      ).toBe("Todo al día");
    });

    it("formatea en singular con una sola unidad en cada bloque", () => {
      expect(
        armarMensajeResumen({
          fecha: HOY,
          sin_novedades: false,
          bloques_con_error: [],
          transferencias: {
            cantidad: 1,
            total: 20000,
            supera_24_horas: 0,
            por_superar_24_horas: 0,
            mas_antiguas: [],
          },
          efectivo: { cantidad: 1, total: 15000, profesoras: [], mas_antiguo: null },
          cuotas_vencidas: {
            cantidad: 1,
            cantidad_alumnos: 1,
            monto_estimado: 10000,
            sin_precio: 0,
            por_profesora: [],
            por_plan: [],
            mas_atrasadas: [],
          },
        }),
      ).toBe(
        "Resumen diario: 1 transferencia por confirmar ($20000), 1 cobro en efectivo sin rendir ($15000), 1 alumno con cuotas vencidas ($10000).",
      );
    });

    it("formatea en plural con más de una unidad en cada bloque", () => {
      expect(
        armarMensajeResumen({
          fecha: HOY,
          sin_novedades: false,
          bloques_con_error: [],
          transferencias: {
            cantidad: 3,
            total: 60000,
            supera_24_horas: 0,
            por_superar_24_horas: 0,
            mas_antiguas: [],
          },
          efectivo: { cantidad: 2, total: 30000, profesoras: [], mas_antiguo: null },
          cuotas_vencidas: {
            cantidad: 4,
            cantidad_alumnos: 4,
            monto_estimado: 50000,
            sin_precio: 0,
            por_profesora: [],
            por_plan: [],
            mas_atrasadas: [],
          },
        }),
      ).toBe(
        "Resumen diario: 3 transferencias por confirmar ($60000), 2 cobros en efectivo sin rendir ($30000), 4 alumnos con cuotas vencidas ($50000).",
      );
    });
  });
});
