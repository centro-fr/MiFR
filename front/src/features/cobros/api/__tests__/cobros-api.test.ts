import { describe, expect, it } from "vitest";
import { calcularCotizacionCobro } from "@/features/cobros/api/cobros-api";
import type { Promocion } from "@/types/promocion";

const promocion: Promocion = {
  id: "2",
  codigo: "NUEVOFR",
  nombre: "Primera cuota",
  tipoDescuento: "MONTO_FIJO",
  valor: 3000,
  fechaDesde: "2026-10-01",
  fechaHasta: "2026-11-30",
  activo: true,
  estado: "ACTIVA",
  planes: [{ id: "1", nombre: "Plan Básico" }],
};

describe("calcularCotizacionCobro", () => {
  it("aplica la promoción asociada a la inscripción", () => {
    expect(
      calcularCotizacionCobro(
        { id: 4, precioLista: 25000, idPromocion: 2, idPlan: 1 },
        [promocion],
      ),
    ).toEqual({
      id_plan_precio: 4,
      precio_lista: 25000,
      descuento: 3000,
      monto: 22000,
      promocion: { id_promocion: 2, codigo: "NUEVOFR", nombre: "Primera cuota" },
    });
  });

  it("no aplica promociones desactivadas o no asociadas al plan", () => {
    expect(
      calcularCotizacionCobro(
        { id: 4, precioLista: 25000, idPromocion: 2, idPlan: 2 },
        [promocion],
      ),
    ).toMatchObject({ descuento: 0, monto: 25000, promocion: null });
  });
});
