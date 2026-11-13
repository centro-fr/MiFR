import { describe, expect, it } from "vitest";
import { CalculadorVencimientoCuota } from "../calculador-vencimiento-cuota.js";

const calculador = new CalculadorVencimientoCuota();

function fecha(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

describe("CalculadorVencimientoCuota", () => {
  describe("MENSUAL", () => {
    it.each([
      ["un día cualquiera", "2026-10-08", "2026-11-08"],
      ["el último día de un mes de 31 que va a uno de 30", "2026-03-31", "2026-04-30"],
      ["fin de enero en un año común", "2026-01-31", "2026-02-28"],
      ["el 30 de enero en un año común", "2026-01-30", "2026-02-28"],
      ["fin de enero en un año bisiesto", "2028-01-31", "2028-02-29"],
      ["el 30 de enero en un año bisiesto", "2028-01-30", "2028-02-29"],
      ["el 29 de febrero de un año bisiesto", "2028-02-29", "2028-03-29"],
      ["diciembre, que cruza de año", "2026-12-15", "2027-01-15"],
      ["el 31 de diciembre", "2026-12-31", "2027-01-31"],
      ["un pago adelantado, que parte del día siguiente al vencimiento", "2026-11-11", "2026-12-11"],
    ])("calcularVencimiento vence un mes después: %s", (_caso, desde, esperado) => {
      const vencimiento = calculador.calcularVencimiento({ tipoPlan: "MENSUAL", desde: fecha(desde) });

      expect(vencimiento).toEqual(fecha(esperado));
    });

    it("calcularVencimiento devuelve un DATE a las 00:00 UTC", () => {
      const vencimiento = calculador.calcularVencimiento({ tipoPlan: "MENSUAL", desde: fecha("2026-10-08") });

      expect(vencimiento.getUTCHours()).toBe(0);
      expect(vencimiento.getUTCMinutes()).toBe(0);
      expect(vencimiento.getUTCSeconds()).toBe(0);
      expect(vencimiento.getUTCMilliseconds()).toBe(0);
    });

    it("calcularVencimiento no modifica la fecha recibida", () => {
      const desde = fecha("2026-01-31");

      calculador.calcularVencimiento({ tipoPlan: "MENSUAL", desde });

      expect(desde).toEqual(fecha("2026-01-31"));
    });
  });

  describe("CLASE_SUELTA", () => {
    it("calcularVencimiento vence el mismo día de la clase", () => {
      const vencimiento = calculador.calcularVencimiento({
        tipoPlan: "CLASE_SUELTA",
        desde: fecha("2026-10-08"),
      });

      expect(vencimiento).toEqual(fecha("2026-10-08"));
    });

    it("calcularVencimiento devuelve una fecha nueva y no la recibida", () => {
      const desde = fecha("2026-10-08");

      const vencimiento = calculador.calcularVencimiento({ tipoPlan: "CLASE_SUELTA", desde });

      expect(vencimiento).not.toBe(desde);
    });
  });
});
