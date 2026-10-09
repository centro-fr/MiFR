import { describe, expect, it } from "vitest";
import { enteroNoNegativoSchema } from "../esquemas-numero.js";

describe("enteroNoNegativoSchema", () => {
  const schema = enteroNoNegativoSchema(365);

  it.each([0, 1, 365])("acepta %j", (valor) => {
    expect(schema.safeParse(valor).success).toBe(true);
  });

  it.each([-0, -1, 1.5, 366, "5", null])("rechaza %j", (valor) => {
    expect(schema.safeParse(valor).success).toBe(false);
  });
});
