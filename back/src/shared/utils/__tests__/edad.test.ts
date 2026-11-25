import { describe, expect, it } from "vitest";
import { esMenorDeEdad } from "../edad.js";

const HOY = new Date("2026-10-08T00:00:00Z");

describe("esMenorDeEdad", () => {
  it.each([
    ["cumple 18 mañana", "2008-10-09", true],
    ["cumple 18 hoy", "2008-10-08", false],
    ["ya tiene 18", "2008-10-07", false],
  ])("%s", (_caso, nacimiento, esperado) => {
    expect(esMenorDeEdad(new Date(`${nacimiento}T00:00:00Z`), HOY)).toBe(esperado);
  });

  it("toma el 1 de marzo como cumpleaños de quien nació un 29 de febrero", () => {
    const nacimiento = new Date("2008-02-29T00:00:00Z");

    expect(esMenorDeEdad(nacimiento, new Date("2026-02-28T00:00:00Z"))).toBe(true);
    expect(esMenorDeEdad(nacimiento, new Date("2026-03-01T00:00:00Z"))).toBe(false);
  });
});
