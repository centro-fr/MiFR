import { describe, expect, it } from "vitest";
import { alumnoRutinasParamsSchema, crearRutinaSchema } from "../rutina.schemas.js";

const EJERCICIO = { nombre: "Sentadilla", series: 3, repeticiones: "10" };
const BASE = {
  id_alumno: 5,
  nombre: "Adaptación Fuerza - Mes 1",
  fecha_desde: "2026-11-01",
  contenido: { dias: [{ nombre: "Día 1", ejercicios: [EJERCICIO] }] },
};

describe("crearRutinaSchema", () => {
  it("acepta una rutina mínima y completa lo opcional con null", () => {
    const resultado = crearRutinaSchema.safeParse(BASE);

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.fecha_hasta).toBeNull();
      expect(resultado.data.observaciones).toBeNull();
      expect(resultado.data.id_profesora).toBeUndefined();
      expect(resultado.data.contenido.dias[0]?.ejercicios[0]?.notas).toBeNull();
      expect(resultado.data.fecha_desde).toEqual(new Date("2026-11-01T00:00:00Z"));
    }
  });

  it("acepta repeticiones como rango o como tiempo", () => {
    for (const repeticiones of ["8-10", "30 s"]) {
      const contenido = { dias: [{ nombre: "Día 1", ejercicios: [{ ...EJERCICIO, repeticiones }] }] };
      expect(crearRutinaSchema.safeParse({ ...BASE, contenido }).success).toBe(true);
    }
  });

  it("acepta fecha_hasta igual a fecha_desde", () => {
    expect(crearRutinaSchema.safeParse({ ...BASE, fecha_hasta: "2026-11-01" }).success).toBe(true);
  });

  it("rechaza fecha_hasta anterior a fecha_desde (ck_rutinas_fechas)", () => {
    expect(crearRutinaSchema.safeParse({ ...BASE, fecha_hasta: "2026-10-31" }).success).toBe(false);
  });

  it.each([
    ["sin nombre", { nombre: "" }],
    ["nombre de más de 100 caracteres", { nombre: "a".repeat(101) }],
    ["id_alumno en cero", { id_alumno: 0 }],
    ["fecha que no existe", { fecha_desde: "2026-02-30" }],
    ["observaciones de más de 500 caracteres", { observaciones: "a".repeat(501) }],
    ["sin días", { contenido: { dias: [] } }],
    ["día sin ejercicios", { contenido: { dias: [{ nombre: "Día 1", ejercicios: [] }] } }],
    ["más de 7 días", { contenido: { dias: Array.from({ length: 8 }, () => ({ nombre: "Día", ejercicios: [EJERCICIO] })) } }],
  ])("rechaza %s", (_caso, cambio) => {
    expect(crearRutinaSchema.safeParse({ ...BASE, ...cambio }).success).toBe(false);
  });

  it.each([
    ["series en cero", { series: 0 }],
    ["series con decimales", { series: 2.5 }],
    ["más de 20 series", { series: 21 }],
    ["repeticiones vacías", { repeticiones: "" }],
    ["ejercicio sin nombre", { nombre: "" }],
  ])("rechaza un ejercicio con %s", (_caso, cambio) => {
    const contenido = { dias: [{ nombre: "Día 1", ejercicios: [{ ...EJERCICIO, ...cambio }] }] };
    expect(crearRutinaSchema.safeParse({ ...BASE, contenido }).success).toBe(false);
  });
});

describe("alumnoRutinasParamsSchema", () => {
  it("convierte el id a número", () => {
    expect(alumnoRutinasParamsSchema.parse({ id: "7" })).toEqual({ id: 7 });
  });

  it.each(["0", "-1", "1.5", "abc", "07"])("rechaza el id %s", (id) => {
    expect(alumnoRutinasParamsSchema.safeParse({ id }).success).toBe(false);
  });
});