import { describe, expect, it } from "vitest";
import { claseIdParamSchema } from "../clase.schemas.js";

describe("clase.schemas", () => {
  it("acepta ids decimales positivos", () => {
    expect(claseIdParamSchema.parse({ id: "20" })).toEqual({ id: 20 });
  });

  it.each(["0", "01", "-1", "1e1", " 2 "])("rechaza id inválido %s", (id) => {
    expect(claseIdParamSchema.safeParse({ id }).success).toBe(false);
  });
});
