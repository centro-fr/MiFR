import { describe, expect, it } from "vitest";
import {
  contarPorTramo,
  etiquetaTramo,
  textoHoras,
  textoTiempoRestante,
  tramoDePlazo,
} from "../plazo-verificacion";

describe("plazo-verificacion (US-17: 24 horas para verificar)", () => {
  describe("tramoDePlazo", () => {
    it("es a tiempo con menos de 12 horas", () => {
      expect(tramoDePlazo({ horasDesdeLaCarga: 0, superaPlazo: false })).toBe("a-tiempo");
      expect(tramoDePlazo({ horasDesdeLaCarga: 11, superaPlazo: false })).toBe("a-tiempo");
    });

    it("pasa a por vencer desde las 12 horas, justo en el límite", () => {
      expect(tramoDePlazo({ horasDesdeLaCarga: 12, superaPlazo: false })).toBe("por-vencer");
      expect(tramoDePlazo({ horasDesdeLaCarga: 23, superaPlazo: false })).toBe("por-vencer");
    });

    it("es vencida desde las 24 horas, justo en el límite", () => {
      expect(tramoDePlazo({ horasDesdeLaCarga: 24, superaPlazo: false })).toBe("vencida");
      expect(tramoDePlazo({ horasDesdeLaCarga: 50, superaPlazo: false })).toBe("vencida");
    });

    it("es vencida si el back marca superaPlazo, aunque las horas sean pocas", () => {
      expect(tramoDePlazo({ horasDesdeLaCarga: 3, superaPlazo: true })).toBe("vencida");
    });
  });

  describe("textos", () => {
    it("muestra menos de 1 h cuando no pasó una hora", () => {
      expect(textoHoras(0)).toBe("menos de 1 h");
      expect(textoHoras(26)).toBe("26 h");
    });

    it("informa lo que queda del plazo", () => {
      expect(textoTiempoRestante(15)).toBe("Quedan 9 h para responder a tiempo");
      expect(textoTiempoRestante(23)).toBe("Queda menos de 1 h para responder a tiempo");
      expect(textoTiempoRestante(40)).toBe("Queda menos de 1 h para responder a tiempo");
    });

    it("etiqueta cada tramo sin usar la palabra pago", () => {
      expect(etiquetaTramo("a-tiempo")).toBe("A tiempo");
      expect(etiquetaTramo("por-vencer")).toBe("Por vencer");
      expect(etiquetaTramo("vencida")).toBe("Vencida en verificación");
    });
  });

  it("cuenta las pendientes por tramo", () => {
    const cuenta = contarPorTramo([
      { horasDesdeLaCarga: 1, superaPlazo: false },
      { horasDesdeLaCarga: 5, superaPlazo: false },
      { horasDesdeLaCarga: 14, superaPlazo: false },
      { horasDesdeLaCarga: 30, superaPlazo: true },
    ]);
    expect(cuenta).toEqual({ "a-tiempo": 2, "por-vencer": 1, vencida: 1 });
  });
});
