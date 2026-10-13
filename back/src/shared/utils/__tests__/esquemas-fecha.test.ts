import { describe, expect, it } from "vitest";
import { fechaSchema } from "../esquemas-fecha.js";

describe("fechaSchema", () => {
  it("convierte AAAA-MM-DD al día a las 00:00 UTC", () => {
    expect(fechaSchema.parse("2026-10-12")).toEqual(new Date("2026-10-12T00:00:00Z"));
  });

  it.each([
    ["un día que no existe", "2026-02-30"],
    ["otro formato", "12/10/2026"],
    ["fecha y hora", "2026-10-12T10:00:00Z"],
    ["texto vacío", ""],
    ["un número", 20261012],
    ["null", null],
  ])("rechaza %s", (_caso, valor) => {
    expect(fechaSchema.safeParse(valor).success).toBe(false);
  });
});
