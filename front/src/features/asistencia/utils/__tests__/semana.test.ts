import { describe, expect, it } from "vitest";
import { diaInicial, diasDeLaSemana, diaYMes, lunesDeLaSemana, tituloDeLaSemana } from "../semana";

describe("semana de clases de la profesora", () => {
  it("toma el lunes de la semana, también desde el domingo", () => {
    expect(lunesDeLaSemana("2026-10-20")).toBe("2026-10-19");
    expect(lunesDeLaSemana("2026-10-19")).toBe("2026-10-19");
    expect(lunesDeLaSemana("2026-10-25")).toBe("2026-10-19");
  });

  it("arma la semana de lunes a sábado", () => {
    const dias = diasDeLaSemana("2026-10-19");
    expect(dias.map((d) => d.corto)).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]);
    expect(dias.map((d) => d.numero)).toEqual([19, 20, 21, 22, 23, 24]);
  });

  it("el domingo abre el lunes siguiente", () => {
    expect(diaInicial("2026-10-25")).toBe("2026-10-26");
    expect(diaInicial("2026-10-21")).toBe("2026-10-21");
  });

  it("titula la semana con uno o dos meses", () => {
    expect(tituloDeLaSemana(diasDeLaSemana("2026-10-19"))).toBe("Semana del 19 al 24 de octubre");
    expect(tituloDeLaSemana(diasDeLaSemana("2026-10-26"))).toBe("Semana del 26 al 31 de octubre");
    expect(tituloDeLaSemana(diasDeLaSemana("2026-11-30"))).toBe("Semana del 30 de noviembre al 5 de diciembre");
    expect(diaYMes("2026-10-20")).toBe("20 de octubre");
  });
});
