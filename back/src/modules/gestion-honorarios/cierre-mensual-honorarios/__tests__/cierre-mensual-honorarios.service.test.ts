import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IInfoParametros } from "../../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { ICierreLiquidaciones } from "../../liquidacion/interface/i-cierre-liquidaciones.js";
import { CierreMensualHonorariosService } from "../cierre-mensual-honorarios.service.js";

function dia(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

describe("CierreMensualHonorariosService", () => {
  let liquidaciones: { cerrarMes: ReturnType<typeof vi.fn> };
  let parametros: { obtener: ReturnType<typeof vi.fn> };
  let proceso: CierreMensualHonorariosService;

  beforeEach(() => {
    liquidaciones = {
      cerrarMes: vi.fn(async ({ periodo }: { periodo: string }) => ({ periodo, cerradas: 3 })),
    };
    parametros = { obtener: vi.fn(async () => 5) };
    proceso = new CierreMensualHonorariosService(
      liquidaciones as unknown as ICierreLiquidaciones,
      parametros as unknown as IInfoParametros,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cerrarMesAnterior cierra el mes anterior, con su primer y su último día, desde el día de cierre", async () => {
    await expect(proceso.cerrarMesAnterior(new Date("2026-11-05T12:00:00Z"))).resolves.toEqual({
      periodo: "2026-10",
      cerradas: 3,
    });
    expect(parametros.obtener).toHaveBeenCalledWith("DIA_CIERRE_HONORARIOS");
    expect(liquidaciones.cerrarMes).toHaveBeenCalledWith({
      periodo: "2026-10",
      desde: dia("2026-10-01"),
      hasta: dia("2026-10-31"),
    });
  });

  it("antes del día de cierre no cierra: quedan días para los cobros atrasados", async () => {
    await expect(proceso.cerrarMesAnterior(new Date("2026-11-04T12:00:00Z"))).resolves.toBeNull();
    expect(liquidaciones.cerrarMes).not.toHaveBeenCalled();
  });

  it("usa el día de cierre configurado", async () => {
    parametros.obtener.mockResolvedValue(1);

    await proceso.cerrarMesAnterior(new Date("2026-11-01T12:00:00Z"));

    expect(liquidaciones.cerrarMes).toHaveBeenCalledTimes(1);
  });

  it("el 4/11 a las 22:00 de Argentina todavía no es día 5, aunque en UTC ya lo sea", async () => {
    await expect(proceso.cerrarMesAnterior(new Date("2026-11-05T01:00:00Z"))).resolves.toBeNull();
  });

  it("en enero cierra diciembre del año anterior", async () => {
    await proceso.cerrarMesAnterior(new Date("2027-01-15T12:00:00Z"));

    expect(liquidaciones.cerrarMes).toHaveBeenCalledWith({
      periodo: "2026-12",
      desde: dia("2026-12-01"),
      hasta: dia("2026-12-31"),
    });
  });

  it("en marzo cierra febrero hasta su último día", async () => {
    await proceso.cerrarMesAnterior(new Date("2028-03-10T12:00:00Z"));

    expect(liquidaciones.cerrarMes).toHaveBeenCalledWith(
      expect.objectContaining({ periodo: "2028-02", hasta: dia("2028-02-29") }),
    );
  });

  it("cierra cada mes una sola vez por proceso y vuelve a correr al cambiar de mes", async () => {
    await proceso.cerrarMesAnterior(new Date("2026-11-05T12:00:00Z"));
    await expect(proceso.cerrarMesAnterior(new Date("2026-11-20T12:00:00Z"))).resolves.toBeNull();
    await proceso.cerrarMesAnterior(new Date("2026-12-07T12:00:00Z"));

    expect(liquidaciones.cerrarMes.mock.calls.map(([{ periodo }]) => periodo)).toEqual([
      "2026-10",
      "2026-11",
    ]);
  });

  it("si el cierre falla, la próxima corrida lo vuelve a intentar", async () => {
    liquidaciones.cerrarMes.mockRejectedValueOnce(new Error("base caída"));
    const ahora = new Date("2026-11-06T12:00:00Z");

    await expect(proceso.cerrarMesAnterior(ahora)).rejects.toThrow("base caída");
    await proceso.cerrarMesAnterior(ahora);

    expect(liquidaciones.cerrarMes).toHaveBeenCalledTimes(2);
  });

  it("sin fecha usa la hora actual", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));

    await proceso.cerrarMesAnterior();

    expect(liquidaciones.cerrarMes).toHaveBeenCalledWith(expect.objectContaining({ periodo: "2026-02" }));
  });
});
