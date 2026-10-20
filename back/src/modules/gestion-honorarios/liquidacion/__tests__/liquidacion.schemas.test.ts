import { describe, expect, it } from "vitest";
import {
  generarLiquidacionesSchema,
  liquidacionIdParamSchema,
  listarLiquidacionesQuerySchema,
} from "../liquidacion.schemas.js";

function dia(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

describe("período", () => {
  it.each<[string, string, string]>([
    ["2026-10", "2026-10-01", "2026-10-31"],
    ["2026-02", "2026-02-01", "2026-02-28"],
    ["2028-02", "2028-02-01", "2028-02-29"],
    ["2026-12", "2026-12-01", "2026-12-31"],
  ])("%s va del %s al %s", (periodo, desde, hasta) => {
    expect(generarLiquidacionesSchema.parse({ periodo })).toEqual({
      periodo: { periodo, desde: dia(desde), hasta: dia(hasta) },
    });
    expect(listarLiquidacionesQuerySchema.parse({ periodo }).periodo.hasta).toEqual(dia(hasta));
  });

  it.each<[string, unknown]>([
    ["sin período", undefined],
    ["un número", 202610],
    ["sin guion", "202610"],
    ["mes 13", "2026-13"],
    ["mes 00", "2026-00"],
    ["un mes de un dígito", "2026-1"],
    ["con día", "2026-10-01"],
    ["un año fuera de rango", "1999-10"],
  ])("rechaza %s", (_caso, periodo) => {
    expect(generarLiquidacionesSchema.safeParse({ periodo }).success).toBe(false);
    expect(listarLiquidacionesQuerySchema.safeParse({ periodo }).success).toBe(false);
  });
});

describe("liquidacionIdParamSchema", () => {
  it("convierte el id de la ruta a número", () => {
    expect(liquidacionIdParamSchema.parse({ id: "4" })).toEqual({ id: 4 });
  });

  it.each(["abc", "0", "-1"])("rechaza el id %s", (id) => {
    expect(liquidacionIdParamSchema.safeParse({ id }).success).toBe(false);
  });
});