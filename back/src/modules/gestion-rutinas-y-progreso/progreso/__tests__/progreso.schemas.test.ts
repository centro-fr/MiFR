import { describe, expect, it } from "vitest";
import { alumnoProgresoParamsSchema, registrarProgresoSchema } from "../progreso.schemas.js";

const BASE = { id_alumno: 5, medidas: [{ codigo: "PESO", valor: 62.5 }] };

describe("registrarProgresoSchema", () => {
  it("acepta un registro mínimo y completa lo opcional", () => {
    const resultado = registrarProgresoSchema.safeParse(BASE);

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.fecha).toBeUndefined();
      expect(resultado.data.id_profesora).toBeUndefined();
      expect(resultado.data.observaciones).toBeNull();
    }
  });

  it("convierte la fecha a las 00:00 UTC", () => {
    const resultado = registrarProgresoSchema.safeParse({ ...BASE, fecha: "2026-10-20" });

    expect(resultado.success && resultado.data.fecha).toEqual(new Date("2026-10-20T00:00:00Z"));
  });

  it("acepta varias medidas distintas", () => {
    const medidas = [
      { codigo: "PESO", valor: 62.5 },
      { codigo: "TALLA", valor: 165 },
      { codigo: "GRASA_CORPORAL", valor: 24.3 },
    ];

    expect(registrarProgresoSchema.safeParse({ ...BASE, medidas }).success).toBe(true);
  });

  it.each([
    ["peso en cero", { codigo: "PESO", valor: 0 }],
    ["peso negativo", { codigo: "PESO", valor: -5 }],
    ["peso por debajo del rango", { codigo: "PESO", valor: 1 }],
    ["peso por encima del rango", { codigo: "PESO", valor: 401 }],
    ["talla fuera de rango", { codigo: "TALLA", valor: 300 }],
    ["grasa corporal mayor a 70", { codigo: "GRASA_CORPORAL", valor: 80 }],
    ["más de dos decimales", { codigo: "PESO", valor: 62.555 }],
    ["valor como texto", { codigo: "PESO", valor: "62" }],
    ["medida que no existe", { codigo: "ALTURA", valor: 165 }],
  ])("rechaza %s", (_caso, medida) => {
    expect(registrarProgresoSchema.safeParse({ ...BASE, medidas: [medida] }).success).toBe(false);
  });

  it("rechaza un registro sin medidas", () => {
    expect(registrarProgresoSchema.safeParse({ ...BASE, medidas: [] }).success).toBe(false);
  });

  it("rechaza repetir una medida", () => {
    const medidas = [
      { codigo: "PESO", valor: 62 },
      { codigo: "PESO", valor: 63 },
    ];

    expect(registrarProgresoSchema.safeParse({ ...BASE, medidas }).success).toBe(false);
  });

  it.each([
    ["id_alumno en cero", { id_alumno: 0 }],
    ["fecha que no existe", { fecha: "2026-02-30" }],
    ["observaciones de más de 500 caracteres", { observaciones: "a".repeat(501) }],
  ])("rechaza %s", (_caso, cambio) => {
    expect(registrarProgresoSchema.safeParse({ ...BASE, ...cambio }).success).toBe(false);
  });
});

describe("alumnoProgresoParamsSchema", () => {
  it("convierte el id a número", () => {
    expect(alumnoProgresoParamsSchema.parse({ id: "7" })).toEqual({ id: 7 });
  });

  it.each(["0", "-1", "1.5", "abc"])("rechaza el id %s", (id) => {
    expect(alumnoProgresoParamsSchema.safeParse({ id }).success).toBe(false);
  });
});
