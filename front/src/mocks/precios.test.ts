import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/mocks/db";
import type { PlanPrecioMock } from "@/mocks/data/inscripciones";
import { precioProgramadoDePlan, precioVigenteDePlan } from "@/mocks/precios";

const preciosOriginales = structuredClone(db.planPrecios);

function precio(id: number, monto: number, desde: string, hasta: string | null): PlanPrecioMock {
  return {
    id_plan_precio: id,
    id_plan: 1,
    precio: monto,
    fecha_vigencia_desde: `${desde}T00:00:00.000Z`,
    fecha_vigencia_hasta: hasta ? `${hasta}T00:00:00.000Z` : null,
  };
}

describe("precios mock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
    db.planPrecios.splice(
      0,
      db.planPrecios.length,
      precio(1, 25000, "2026-09-01", "2026-10-14"),
      precio(2, 28000, "2026-10-15", null),
      precio(3, 32000, "2026-11-01", null),
    );
  });

  afterEach(() => {
    db.planPrecios.splice(0, db.planPrecios.length, ...preciosOriginales);
    vi.useRealTimers();
  });

  it("mantiene el precio vigente separado del precio programado", () => {
    expect(precioVigenteDePlan(1)?.precio).toBe(28000);
    expect(precioProgramadoDePlan(1)?.precio).toBe(32000);
  });

  it("aplica el precio programado desde su fecha sin conservar el anterior como vigente", () => {
    vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));

    expect(precioVigenteDePlan(1)?.precio).toBe(32000);
    expect(precioProgramadoDePlan(1)).toBeUndefined();
  });

  it("no considera vigente un precio cuyo rango ya terminó", () => {
    vi.setSystemTime(new Date("2026-10-14T12:00:00.000Z"));

    expect(precioVigenteDePlan(1)?.precio).toBe(25000);
  });
});
