import { describe, expect, it } from "vitest";
import { fechaActualArgentina } from "../fecha-argentina.js";

describe("fechaActualArgentina", () => {
  it("devuelve el día argentino aunque en UTC ya sea el día siguiente", () => {
    // 23:30 del 4 de octubre en Argentina (UTC-3) son las 02:30 del 5 en UTC.
    const ahora = new Date("2026-10-05T02:30:00Z");

    expect(fechaActualArgentina(ahora)).toEqual(new Date("2026-10-04T00:00:00Z"));
  });

  it("devuelve el mismo día cuando Argentina y UTC coinciden", () => {
    const ahora = new Date("2026-10-04T15:00:00Z");

    expect(fechaActualArgentina(ahora)).toEqual(new Date("2026-10-04T00:00:00Z"));
  });

  it("cambia de día a la medianoche argentina, no a la de UTC", () => {
    expect(fechaActualArgentina(new Date("2026-10-05T02:59:59Z"))).toEqual(new Date("2026-10-04T00:00:00Z"));
    expect(fechaActualArgentina(new Date("2026-10-05T03:00:00Z"))).toEqual(new Date("2026-10-05T00:00:00Z"));
  });

  it("cruza bien el cambio de año", () => {
    const ahora = new Date("2027-01-01T01:00:00Z");

    expect(fechaActualArgentina(ahora)).toEqual(new Date("2026-12-31T00:00:00Z"));
  });

  it("usa el reloj actual si no recibe fecha", () => {
    expect(fechaActualArgentina()).toBeInstanceOf(Date);
  });
});
