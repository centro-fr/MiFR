import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IOtorgamientoInsignias } from "../../insignia/interface/i-otorgamiento-insignias.js";
import { CierreMensualInsigniasService } from "../cierre-mensual-insignias.service.js";

describe("CierreMensualInsigniasService", () => {
  let insignias: { cerrarMes: ReturnType<typeof vi.fn> };
  let proceso: CierreMensualInsigniasService;

  beforeEach(() => {
    insignias = { cerrarMes: vi.fn(async (periodo: string) => ({ periodo, mes_perfecto: 2, podio: 3 })) };
    proceso = new CierreMensualInsigniasService(insignias as unknown as IOtorgamientoInsignias);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cerrarMesAnterior cierra el mes anterior al día de Argentina", async () => {
    // 1/10 a las 00:30 de Argentina: en UTC ya es 1/10 a las 03:30.
    const ahora = new Date("2026-10-01T03:30:00Z");

    await expect(proceso.cerrarMesAnterior(ahora)).resolves.toEqual({
      periodo: "2026-09",
      mes_perfecto: 2,
      podio: 3,
    });
    expect(insignias.cerrarMes).toHaveBeenCalledWith("2026-09", ahora);
  });

  it("el 30/9 a las 22:00 de Argentina todavía es septiembre: cierra agosto", async () => {
    await proceso.cerrarMesAnterior(new Date("2026-10-01T01:00:00Z"));

    expect(insignias.cerrarMes).toHaveBeenCalledWith("2026-08", expect.any(Date));
  });

  it("en enero cierra diciembre del año anterior", async () => {
    await proceso.cerrarMesAnterior(new Date("2027-01-15T12:00:00Z"));

    expect(insignias.cerrarMes).toHaveBeenCalledWith("2026-12", expect.any(Date));
  });

  it("cierra cada mes una sola vez por proceso y vuelve a correr al cambiar de mes", async () => {
    await proceso.cerrarMesAnterior(new Date("2026-10-01T12:00:00Z"));
    await expect(proceso.cerrarMesAnterior(new Date("2026-10-20T12:00:00Z"))).resolves.toBeNull();
    await proceso.cerrarMesAnterior(new Date("2026-11-01T12:00:00Z"));

    expect(insignias.cerrarMes.mock.calls.map(([periodo]) => periodo)).toEqual(["2026-09", "2026-10"]);
  });

  it("si el cierre falla, la próxima corrida lo vuelve a intentar", async () => {
    insignias.cerrarMes.mockRejectedValueOnce(new Error("base caída"));
    const ahora = new Date("2026-10-02T12:00:00Z");

    await expect(proceso.cerrarMesAnterior(ahora)).rejects.toThrow("base caída");
    await proceso.cerrarMesAnterior(ahora);

    expect(insignias.cerrarMes).toHaveBeenCalledTimes(2);
  });

  it("sin fecha usa la hora actual", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));

    await proceso.cerrarMesAnterior();

    expect(insignias.cerrarMes).toHaveBeenCalledWith("2026-02", new Date("2026-03-10T12:00:00Z"));
  });
});
