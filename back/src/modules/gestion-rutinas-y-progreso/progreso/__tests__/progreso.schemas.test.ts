import { describe, expect, it } from "vitest";
import {
  actualizarProgresoSchema,
  alumnoProgresoParamsSchema,
  registrarProgresoSchema,
  registroProgresoParamsSchema,
} from "../progreso.schemas.js";

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

describe("actualizarProgresoSchema", () => {
  it.each([
    ["solo medidas", { medidas: [{ codigo: "PESO", valor: 62.4 }] }],
    ["solo fecha", { fecha: "2026-10-20" }],
    ["solo observaciones", { observaciones: "Control mensual" }],
    ["borrar las observaciones con null", { observaciones: null }],
    ["borrar las observaciones con un texto vacío", { observaciones: "" }],
    ["todo junto", { fecha: "2026-10-20", observaciones: "Corregido", medidas: [{ codigo: "TALLA", valor: 165 }] }],
  ])("acepta corregir %s", (_caso, cuerpo) => {
    expect(actualizarProgresoSchema.safeParse(cuerpo).success).toBe(true);
  });

  it("distingue no tocar las observaciones de borrarlas", () => {
    const sinTocar = actualizarProgresoSchema.parse({ fecha: "2026-10-20" });
    const borrada = actualizarProgresoSchema.parse({ observaciones: "" });

    expect(sinTocar.observaciones).toBeUndefined();
    expect(borrada.observaciones).toBeNull();
  });

  it.each([
    ["un cuerpo vacío", {}],
    ["peso en cero", { medidas: [{ codigo: "PESO", valor: 0 }] }],
    ["peso fuera de rango", { medidas: [{ codigo: "PESO", valor: 900 }] }],
    ["más de dos decimales", { medidas: [{ codigo: "PESO", valor: 62.555 }] }],
    ["una lista de medidas vacía", { medidas: [] }],
    ["una medida repetida", { medidas: [{ codigo: "PESO", valor: 60 }, { codigo: "PESO", valor: 61 }] }],
    ["una medida que no existe", { medidas: [{ codigo: "ALTURA", valor: 165 }] }],
    ["una fecha que no existe", { fecha: "2026-02-30" }],
    ["observaciones de más de 500 caracteres", { observaciones: "a".repeat(501) }],
  ])("rechaza corregir con %s", (_caso, cuerpo) => {
    expect(actualizarProgresoSchema.safeParse(cuerpo).success).toBe(false);
  });

  it("no deja cambiar el alumno ni la profesora: esos campos se descartan", () => {
    const resultado = actualizarProgresoSchema.parse({ id_alumno: 9, id_profesora: 3, fecha: "2026-10-20" });

    expect(resultado).not.toHaveProperty("id_alumno");
    expect(resultado).not.toHaveProperty("id_profesora");
  });
});

describe("registroProgresoParamsSchema", () => {
  it("convierte el id a número", () => {
    expect(registroProgresoParamsSchema.parse({ id: "7" })).toEqual({ id: 7 });
  });

  it.each(["0", "-1", "1.5", "abc"])("rechaza el id %s", (id) => {
    expect(registroProgresoParamsSchema.safeParse({ id }).success).toBe(false);
  });
});
