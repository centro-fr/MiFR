import { describe, expect, it } from "vitest";
import { enteroNoNegativoSchema, montoSchema } from "../esquemas-numero.js";

describe("enteroNoNegativoSchema", () => {
  const schema = enteroNoNegativoSchema(365);

  it.each([0, 1, 365])("acepta %j", (valor) => {
    expect(schema.safeParse(valor).success).toBe(true);
  });

  it.each([-0, -1, 1.5, 366, "5", null])("rechaza %j", (valor) => {
    expect(schema.safeParse(valor).success).toBe(false);
  });
});

describe("montoSchema", () => {
  const schema = montoSchema("monto");

  it.each([0.01, 19.99, 28000, 99_999_999.99])("acepta %j", (valor) => {
    expect(schema.safeParse(valor).success).toBe(true);
  });

  it.each([0, -0, -1, 10.123, 100_000_000, "28000", null])("rechaza %j", (valor) => {
    expect(schema.safeParse(valor).success).toBe(false);
  });

  it("nombra el campo en el mensaje", () => {
    expect(schema.safeParse(0).error?.issues[0].message).toBe("El monto tiene que ser mayor a 0");
  });
});
