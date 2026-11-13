import { describe, expect, it } from "vitest";
import { idDesdeTextoSchema, idSchema } from "../esquemas-id.js";

describe("esquemas de id", () => {
  it("idSchema acepta el máximo de INTEGER y rechaza uno más", () => {
    expect(idSchema.safeParse(2_147_483_647).success).toBe(true);
    expect(idSchema.safeParse(2_147_483_648).success).toBe(false);
  });

  it.each([-0, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "1", null, true])(
    "idSchema rechaza %j",
    (valor) => {
      expect(idSchema.safeParse(valor).success).toBe(false);
    },
  );

  it.each(["0", "-0", "-1", "1.5", "abc", "99999999999", "2147483648", ""])(
    "idDesdeTextoSchema rechaza %j",
    (valor) => {
      expect(idDesdeTextoSchema.safeParse(valor).success).toBe(false);
    },
  );

  // Number() convierte todos estos en un id válido; aceptarlos haría que una misma entidad
  // responda en varias URLs.
  it.each(["0x10", "0b11", "1e1", "+5", " 7 ", "5.", "1.0", "007", "Infinity"])(
    "idDesdeTextoSchema rechaza %j aunque Number() lo convierta en un número",
    (valor) => {
      expect(idDesdeTextoSchema.safeParse(valor).success).toBe(false);
    },
  );

  it("idDesdeTextoSchema rechaza un id repetido en la query (llega como arreglo)", () => {
    expect(idDesdeTextoSchema.safeParse(["5"]).success).toBe(false);
  });

  it("idDesdeTextoSchema convierte un id válido de la URL a número", () => {
    expect(idDesdeTextoSchema.parse("42")).toBe(42);
    expect(idDesdeTextoSchema.parse("2147483647")).toBe(2_147_483_647);
  });
});
