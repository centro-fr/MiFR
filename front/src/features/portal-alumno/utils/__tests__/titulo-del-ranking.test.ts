import { describe, expect, it } from "vitest";
import { tituloDelRanking } from "../titulo-del-ranking";

const HOY = "2026-11-12";

describe("tituloDelRanking", () => {
  it("nombra el mes en curso (por defecto el back trae del 1 a hoy)", () => {
    expect(tituloDelRanking({ desde: "2026-11-01", hasta: "2026-11-12" }, HOY)).toBe("Ranking de noviembre");
    expect(tituloDelRanking({ desde: "2026-10-01T00:00:00.000Z", hasta: "2026-10-31" }, HOY)).toBe("Ranking de octubre");
  });

  it("agrega el año a un mes de otro año", () => {
    expect(tituloDelRanking({ desde: "2025-12-01", hasta: "2025-12-31" }, HOY)).toBe("Ranking de diciembre 2025");
  });

  it("nombra el año cuando arranca el 1 de enero", () => {
    expect(tituloDelRanking({ desde: "2026-01-01", hasta: "2026-11-12" }, HOY)).toBe("Ranking de 2026");
  });

  it("muestra las fechas en cualquier otro período", () => {
    expect(tituloDelRanking({ desde: "2026-10-05", hasta: "2026-10-20" }, HOY)).toBe("Ranking del 05/10/2026 al 20/10/2026");
  });
});
