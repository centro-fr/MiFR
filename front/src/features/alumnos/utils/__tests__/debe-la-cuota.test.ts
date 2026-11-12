import { describe, expect, it } from "vitest";
import type { EstadoCuota } from "@/features/alumnos/schemas/alumno";
import { debeLaCuota } from "../situacion-cuota";

const con = (estado: EstadoCuota) => ({ situacion_cuota: { estado } });

describe("debeLaCuota (filtro Deben de la profesora)", () => {
  it("debe quien la tiene por vencer, vencida o sin pagar", () => {
    for (const estado of ["POR_VENCER", "VENCIDA", "CLASE_SUELTA_VENCIDA", "PENDIENTE_DE_PAGO"] as const) {
      expect(debeLaCuota(con(estado))).toBe(true);
    }
  });

  it("no debe quien está al día ni quien no tiene plan", () => {
    expect(debeLaCuota(con("AL_DIA"))).toBe(false);
    expect(debeLaCuota(con("CLASE_SUELTA_VIGENTE"))).toBe(false);
    expect(debeLaCuota({ situacion_cuota: null })).toBe(false);
  });
});
