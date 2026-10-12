import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calcularEdad, esMenorDeEdad } from "./edad";

describe("Utilidad calcularEdad y esMenorDeEdad", () => {
  beforeEach(() => {
    // Fijar fecha actual para tests deterministas: 2026-10-10
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calcula la edad correctamente para alguien nacido hace 20 años", () => {
    expect(calcularEdad("2006-05-15")).toBe(20);
  });

  it("calcula la edad correctamente si aún no cumplió años este año", () => {
    expect(calcularEdad("2006-12-25")).toBe(19);
  });

  it("calcula la edad si hoy es su cumpleaños", () => {
    expect(calcularEdad("2006-10-10")).toBe(20);
  });

  it("retorna null si la fecha es inválida o vacía", () => {
    expect(calcularEdad("")).toBeNull();
    expect(calcularEdad(null)).toBeNull();
    expect(calcularEdad("fecha-invalida")).toBeNull();
  });

  it("detecta correctamente menor de edad (< 18 años)", () => {
    // Nacido en 2012 -> 14 años
    expect(esMenorDeEdad("2012-04-10")).toBe(true);
    // Nacido en 2008-11-01 -> todavía tiene 17 años
    expect(esMenorDeEdad("2008-11-01")).toBe(true);
  });

  it("detecta correctamente mayor de edad (>= 18 años)", () => {
    // Nacido en 2008-01-01 -> 18 años cumplidos
    expect(esMenorDeEdad("2008-01-01")).toBe(false);
    // Nacido en 1995 -> 31 años
    expect(esMenorDeEdad("1995-05-20")).toBe(false);
  });
});
