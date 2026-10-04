import { describe, expect, it } from "vitest";
import { idDesdeTextoSchema, idSchema } from "../esquemas-id.js";

describe("esquemas de id", () => {
  it("idSchema acepta el máximo de INTEGER y rechaza uno más", () => {
    expect(idSchema.safeParse(2_147_483_647).success).toBe(true);
    expect(idSchema.safeParse(2_147_483_648).success).toBe(false);
  });

  it.each(["0", "-1", "1.5", "abc", "99999999999"])("idDesdeTextoSchema rechaza %j", (valor) => {
    expect(idDesdeTextoSchema.safeParse(valor).success).toBe(false);
  });

  it("idDesdeTextoSchema convierte un id válido de la URL a número", () => {
    expect(idDesdeTextoSchema.parse("42")).toBe(42);
  });
});
