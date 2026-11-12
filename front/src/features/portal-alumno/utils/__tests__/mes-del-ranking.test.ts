import { describe, expect, it } from "vitest";
import { etiquetaDelMes, periodoDelMes, sumarMeses } from "../mes-del-ranking";

describe("mes del ranking", () => {
  it("cambia de mes, también de año", () => {
    expect(sumarMeses("2026-11", -1)).toBe("2026-10");
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
    expect(sumarMeses("2025-12", 1)).toBe("2026-01");
  });

  it("nombra el mes con su año", () => {
    expect(etiquetaDelMes("2026-11")).toBe("Noviembre 2026");
  });

  it("pide el mes en curso sin filtros y un mes pasado completo", () => {
    expect(periodoDelMes("2026-11", "2026-11-12")).toEqual({});
    expect(periodoDelMes("2026-02", "2026-11-12")).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
  });
});
