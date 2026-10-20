import { describe, expect, it } from "vitest";
import {
  cerrarTarifaSchema,
  listarTarifasQuerySchema,
  registrarTarifaSchema,
  tarifaIdParamSchema,
} from "../tarifa-honorario.schemas.js";

const valida = {
  id_profesora: 10,
  concepto: "ALUMNO_A_CARGO",
  tipo_valor: "MONTO_FIJO",
  valor: 5000,
  fecha_vigencia_desde: "2026-11-01",
};

describe("registrarTarifaSchema", () => {
  it("acepta una tarifa para todos los planes: sin id_plan queda en null y la fecha pasa a Date", () => {
    expect(registrarTarifaSchema.parse(valida)).toEqual({
      ...valida,
      id_plan: null,
      fecha_vigencia_desde: new Date("2026-11-01T00:00:00Z"),
    });
  });

  it.each<[string, unknown, number | null]>([
    ["id_plan en null", null, null],
    ["id_plan de un plan", 7, 7],
  ])("acepta %s", (_caso, id_plan, esperado) => {
    expect(registrarTarifaSchema.parse({ ...valida, id_plan }).id_plan).toBe(esperado);
  });

  it.each<[string, Record<string, unknown>]>([
    ["un porcentaje de 100", { tipo_valor: "PORCENTAJE", valor: 100 }],
    ["un porcentaje con decimales", { tipo_valor: "PORCENTAJE", valor: 12.5 }],
    ["HORA_SUPLENCIA sin plan", { concepto: "HORA_SUPLENCIA" }],
    ["un monto fijo mayor a 100", { valor: 250000.5 }],
  ])("acepta %s", (_caso, cambios) => {
    expect(registrarTarifaSchema.safeParse({ ...valida, ...cambios }).success).toBe(true);
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["un porcentaje mayor a 100", { tipo_valor: "PORCENTAJE", valor: 100.01 }, "valor"],
    ["HORA_SUPLENCIA con plan", { concepto: "HORA_SUPLENCIA", id_plan: 7 }, "id_plan"],
    ["un valor en 0", { valor: 0 }, "valor"],
    ["un valor negativo", { valor: -1 }, "valor"],
    ["un valor con tres decimales", { valor: 10.123 }, "valor"],
    ["un valor que no entra en la columna", { valor: 100000000 }, "valor"],
    ["un concepto que no existe", { concepto: "BONO" }, "concepto"],
    ["un tipo de valor que no existe", { tipo_valor: "PUNTOS" }, "tipo_valor"],
    ["una fecha que no existe", { fecha_vigencia_desde: "2026-02-30" }, "fecha_vigencia_desde"],
    ["una profesora en 0", { id_profesora: 0 }, "id_profesora"],
    ["un id_plan en 0", { id_plan: 0 }, "id_plan"],
  ])("rechaza %s", (_caso, cambios, campo) => {
    const resultado = registrarTarifaSchema.safeParse({ ...valida, ...cambios });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues.map(({ path }) => path[0])).toContain(campo);
  });
});

describe("tarifaIdParamSchema", () => {
  it("convierte el id de la ruta a número", () => {
    expect(tarifaIdParamSchema.parse({ id: "5" })).toEqual({ id: 5 });
  });

  it.each(["abc", "0", "-3"])("rechaza el id %s", (id) => {
    expect(tarifaIdParamSchema.safeParse({ id }).success).toBe(false);
  });
});

describe("listarTarifasQuerySchema", () => {
  it("sin filtros devuelve un objeto vacío", () => {
    expect(listarTarifasQuerySchema.parse({})).toEqual({});
  });

  it.each<[string, boolean]>([
    ["true", true],
    ["false", false],
  ])("convierte vigentes=%s", (texto, esperado) => {
    expect(listarTarifasQuerySchema.parse({ vigentes: texto, id_profesora: "3" })).toEqual({
      vigentes: esperado,
      id_profesora: 3,
    });
  });

  it("rechaza un valor de vigentes que no es true ni false", () => {
    expect(listarTarifasQuerySchema.safeParse({ vigentes: "si" }).success).toBe(false);
  });
});

describe("cerrarTarifaSchema", () => {
  it("convierte la fecha a Date", () => {
    expect(cerrarTarifaSchema.parse({ fecha_hasta: "2026-12-31" })).toEqual({
      fecha_hasta: new Date("2026-12-31T00:00:00Z"),
    });
  });

  it.each<[string, unknown]>([
    ["sin fecha", {}],
    ["una fecha que no existe", { fecha_hasta: "2026-02-30" }],
    ["un texto que no es fecha", { fecha_hasta: "ayer" }],
  ])("rechaza %s", (_caso, cuerpo) => {
    expect(cerrarTarifaSchema.safeParse(cuerpo).success).toBe(false);
  });
});