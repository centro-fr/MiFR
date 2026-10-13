import { describe, expect, it } from "vitest";
import {
  calcularEdad,
  enlaceTelefono,
  enlaceWhatsApp,
  formatearDni,
  formatearFecha,
  inicialesDe,
  textoEdad,
} from "../formato-ficha";

describe("formatearFecha", () => {
  // Una columna DATE no debe correrse un día por el huso horario de Argentina (UTC-3).
  it("muestra la fecha calendario tal cual, sin desfasaje por huso horario", () => {
    expect(formatearFecha("1996-04-24")).toBe("24/04/1996");
    expect(formatearFecha("2026-01-01")).toBe("01/01/2026");
  });

  it("tolera timestamps ISO completos provenientes del backend sin arrojar RangeError", () => {
    expect(formatearFecha("2026-10-15T00:00:00.000Z")).toBe("15/10/2026");
    expect(formatearFecha("2026-10-25T14:30:00.123Z")).toBe("25/10/2026");
    expect(formatearFecha("")).toBe("");
  });
});

describe("calcularEdad", () => {
  it("no suma el año si todavía no llegó el cumpleaños", () => {
    expect(calcularEdad("1996-04-24", new Date(2026, 3, 23))).toBe(29);
  });

  it("suma el año el mismo día del cumpleaños", () => {
    expect(calcularEdad("1996-04-24", new Date(2026, 3, 24))).toBe(30);
  });

  it("calcula la edad de un menor", () => {
    expect(calcularEdad("2014-05-12", new Date(2026, 9, 10))).toBe(12);
  });
});

describe("textoEdad", () => {
  it("usa singular para un año y plural para el resto", () => {
    expect(textoEdad(1)).toBe("1 año");
    expect(textoEdad(28)).toBe("28 años");
  });
});

describe("formatearDni", () => {
  it("agrega los puntos de miles a un DNI de solo dígitos", () => {
    expect(formatearDni("38412985")).toBe("38.412.985");
    expect(formatearDni("5123999")).toBe("5.123.999");
  });
});

describe("inicialesDe", () => {
  it("toma la primera letra del nombre y del apellido en mayúscula", () => {
    expect(inicialesDe("martina", " bianchi")).toBe("MB");
  });
});

describe("enlaceTelefono", () => {
  it("deja solo dígitos y el + inicial", () => {
    expect(enlaceTelefono("+54 351 445-8910")).toBe("tel:+543514458910");
    expect(enlaceTelefono("351 555-0101")).toBe("tel:3515550101");
  });

  // El teléfono es texto libre: nada de lo que traiga puede terminar ejecutándose en el href.
  it("descarta cualquier caracter que no sea un dígito", () => {
    expect(enlaceTelefono("javascript:alert(1)")).toBe("tel:1");
  });
});

describe("enlaceWhatsApp", () => {
  it("arma el enlace de wa.me cuando el número está en formato internacional", () => {
    expect(enlaceWhatsApp("+54 351 445-8910")).toBe("https://wa.me/543514458910");
  });

  // Sin código de país no se puede saber a quién pertenece el número.
  it("no arma enlace si el número no tiene código de país", () => {
    expect(enlaceWhatsApp("351 555-0101")).toBeNull();
  });

  it("no arma enlace si el número es demasiado corto", () => {
    expect(enlaceWhatsApp("+54 1")).toBeNull();
  });
});
