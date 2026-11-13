import { describe, expect, it } from "vitest";
import { CATALOGO_INSIGNIAS } from "../insignia.catalogo.js";

describe("CATALOGO_INSIGNIAS", () => {
  it("tiene el catálogo inicial acordado en SPRINT-5.md", () => {
    expect(CATALOGO_INSIGNIAS.map(({ codigo, tipo, valor_umbral }) => [codigo, tipo, valor_umbral])).toEqual([
      ["RACHA_10", "RACHA", 10],
      ["RACHA_25", "RACHA", 25],
      ["TOTAL_50", "TOTAL_CLASES", 50],
      ["TOTAL_100", "TOTAL_CLASES", 100],
      ["MES_PERFECTO", "MES_PERFECTO", 100],
      ["PODIO_MES", "PODIO_MES", 3],
    ]);
  });

  it("los códigos no se repiten y entran en las columnas del DER", () => {
    const codigos = CATALOGO_INSIGNIAS.map(({ codigo }) => codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    for (const { codigo, nombre, descripcion, valor_umbral } of CATALOGO_INSIGNIAS) {
      expect(codigo.length).toBeLessThanOrEqual(30);
      expect(nombre.length).toBeLessThanOrEqual(60);
      expect(descripcion.length).toBeLessThanOrEqual(255);
      expect(valor_umbral).toBeGreaterThan(0);
    }
  });
});
