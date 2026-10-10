import { describe, expect, it } from "vitest";
import { z } from "zod";
import { LIMITE_MAXIMO, paginacionSchema } from "../esquemas-paginacion.js";

const query = z.object(paginacionSchema(20));

describe("paginacionSchema", () => {
  it("sin limit ni offset usa el límite por defecto desde el principio", () => {
    expect(query.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it("convierte los valores que llegan como texto", () => {
    expect(query.parse({ limit: "50", offset: "100" })).toEqual({ limit: 50, offset: 100 });
  });

  it.each([
    ["limit en 0", { limit: "0" }],
    ["limit por encima del máximo", { limit: String(LIMITE_MAXIMO + 1) }],
    ["limit negativo", { limit: "-1" }],
    ["limit con decimales", { limit: "1.5" }],
    ["limit en notación científica", { limit: "1e2" }],
    ["offset negativo", { offset: "-1" }],
    ["offset con más de 9 dígitos", { offset: "1234567890" }],
  ])("rechaza %s", (_caso, entrada) => {
    expect(query.safeParse(entrada).success).toBe(false);
  });
});
