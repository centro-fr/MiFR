import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IInfoCuotas } from "../../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoPagos } from "../../../gestion-cuotas-y-pagos/pago/interface/i-info-pagos.js";
import { ResumenDiarioPropietariaService } from "../resumen-diario-propietaria.service.js";

// 01:00 UTC del 17/10: en Argentina todavía es el 16.
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
});
