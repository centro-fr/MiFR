import { describe, expect, it } from "vitest";
import { fechaActualArgentina, horaActualArgentina, instanteArgentino } from "../fecha-argentina.js";

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

describe("horaActualArgentina", () => {
  it("formatea la hora en zona horaria de Argentina (UTC-3)", () => {
    // 23:30 UTC -> 20:30 Argentina
    const ahora = new Date("2026-10-18T23:30:00Z");
    expect(horaActualArgentina(ahora)).toBe("20:30");
  });

  it("usa el reloj actual si no recibe fecha", () => {
    expect(horaActualArgentina()).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("instanteArgentino", () => {
  const dia = new Date("2026-10-12T00:00:00Z");

  it("junta el día y la hora del centro en el instante UTC", () => {
    expect(instanteArgentino(dia, new Date("1970-01-01T20:30:15Z"))).toEqual(
      new Date("2026-10-12T23:30:15Z"),
    );
  });

  it("pasa al día siguiente en UTC desde las 21:00 de Argentina", () => {
    expect(instanteArgentino(dia, new Date("1970-01-01T23:00:00Z"))).toEqual(
      new Date("2026-10-13T02:00:00Z"),
    );
  });

  it("cruza bien el cambio de año", () => {
    const fin = new Date("2026-12-31T00:00:00Z");

    expect(instanteArgentino(fin, new Date("1970-01-01T22:00:00Z"))).toEqual(
      new Date("2027-01-01T01:00:00Z"),
    );
  });
});
