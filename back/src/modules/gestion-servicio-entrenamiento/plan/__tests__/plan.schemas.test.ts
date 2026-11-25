import { describe, expect, it } from "vitest";
import {
  actualizarPlanSchema,
  crearPlanSchema,
  listarPlanQuerySchema,
  registrarPrecioSchema,
} from "../plan.schemas.js";

const mensual = { tipo: "MENSUAL", nombre: "Básico 2 días", clases_por_semana: 2, precio: 25000 };

describe("crearPlanSchema", () => {
  it.each([-0, -1, 1.5])("rechaza dias_gracia %j", (dias_gracia) => {
    expect(crearPlanSchema.safeParse({ ...mensual, dias_gracia }).success).toBe(false);
  });

  it("completa dias_gracia en 0, profesora_unica y solo_menores en false si no vienen", () => {
    expect(crearPlanSchema.parse(mensual)).toMatchObject({
      dias_gracia: 0,
      profesora_unica: false,
      solo_menores: false,
    });
  });

  it("acepta un plan mensual sin frecuencia, como un pase libre", () => {
    expect(crearPlanSchema.safeParse({ ...mensual, clases_por_semana: null }).success).toBe(true);
  });

  it.each([0, 8, 2.5])("rechaza clases_por_semana %j", (clases_por_semana) => {
    expect(crearPlanSchema.safeParse({ ...mensual, clases_por_semana }).success).toBe(false);
  });

  it.each([
    ["con clases por semana", { clases_por_semana: 1 }],
    ["con días de gracia", { dias_gracia: 2 }],
  ])("rechaza una clase suelta %s", (_caso, extra) => {
    expect(
      crearPlanSchema.safeParse({ tipo: "CLASE_SUELTA", nombre: "Clase", precio: 5000, ...extra }).success,
    ).toBe(false);
  });

  it("acepta una clase suelta sin frecuencia ni días de gracia", () => {
    expect(crearPlanSchema.safeParse({ tipo: "CLASE_SUELTA", nombre: "Clase", precio: 5000 }).success).toBe(
      true,
    );
  });

  it.each([0, -1, 100_000_000, 10.123, "25000"])("rechaza el precio %j", (precio) => {
    expect(crearPlanSchema.safeParse({ ...mensual, precio }).success).toBe(false);
  });

  it.each([19.99, 0.01, 99_999_999.99])("acepta el precio %j", (precio) => {
    expect(crearPlanSchema.safeParse({ ...mensual, precio }).success).toBe(true);
  });

  it.each(["", "123", "a".repeat(41)])("rechaza el nombre %j", (nombre) => {
    expect(crearPlanSchema.safeParse({ ...mensual, nombre }).success).toBe(false);
  });

  it("rechaza un tipo que no está en el DER", () => {
    expect(crearPlanSchema.safeParse({ ...mensual, tipo: "ANUAL" }).success).toBe(false);
  });

  it.each(["true", 1, null])("rechaza solo_menores %j, que no es un booleano", (solo_menores) => {
    expect(crearPlanSchema.safeParse({ ...mensual, solo_menores }).success).toBe(false);
  });
});

describe("actualizarPlanSchema", () => {
  it("rechaza un cuerpo vacío", () => {
    expect(actualizarPlanSchema.safeParse({}).success).toBe(false);
  });

  it("acepta marcar el plan como solo para menores", () => {
    expect(actualizarPlanSchema.parse({ solo_menores: true })).toEqual({ solo_menores: true });
  });

  it("no acepta cambiar el tipo ni el precio", () => {
    expect(actualizarPlanSchema.parse({ nombre: "Premium", tipo: "CLASE_SUELTA", precio: 1 })).toEqual({
      nombre: "Premium",
    });
  });
});

describe("registrarPrecioSchema", () => {
  it("convierte la fecha a las 00:00 UTC del día", () => {
    expect(registrarPrecioSchema.parse({ precio: 28000, fecha_vigencia_desde: "2026-11-01" })).toEqual({
      precio: 28000,
      fecha_vigencia_desde: new Date("2026-11-01T00:00:00Z"),
    });
  });

  it.each(["01/11/2026", "2026-02-30", null, 20261101])("rechaza la fecha %j", (fecha_vigencia_desde) => {
    expect(registrarPrecioSchema.safeParse({ precio: 28000, fecha_vigencia_desde }).success).toBe(false);
  });

  it("exige la fecha de vigencia", () => {
    expect(registrarPrecioSchema.safeParse({ precio: 28000 }).success).toBe(false);
  });
});

describe("listarPlanQuerySchema", () => {
  it("convierte los filtros que llegan como texto", () => {
    expect(listarPlanQuerySchema.parse({ incluirBajas: "true", id_actividad_exclusiva: "4" })).toEqual({
      incluirBajas: true,
      id_actividad_exclusiva: 4,
    });
  });

  it.each([{ incluirBajas: "si" }, { tipo: "ANUAL" }, { id_actividad_exclusiva: "0" }])(
    "rechaza %j",
    (query) => {
      expect(listarPlanQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});
