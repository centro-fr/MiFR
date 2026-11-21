import { describe, expect, it } from "vitest";
import { SIN_PROMOCION, idDePromocion } from "@/features/cobros/utils/promociones-cobro";

describe("idDePromocion", () => {
  it("devuelve el id de la promoción elegida", () => {
    expect(idDePromocion("4")).toBe(4);
  });

  // El back toma un id_promocion ausente como "la de la inscripción": "Sin promoción" tiene que ir explícita.
  it("devuelve null con Sin promoción", () => {
    expect(idDePromocion(SIN_PROMOCION)).toBeNull();
  });
});
