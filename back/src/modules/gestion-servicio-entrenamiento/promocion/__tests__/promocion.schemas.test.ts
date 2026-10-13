import { describe, expect, it } from "vitest";
import {
  actualizarPromocionSchema,
  crearPromocionSchema,
  listarPromocionesQuerySchema,
  promocionIdParamSchema,
} from "../promocion.schemas.js";

const alta = {
  codigo: "verano-26",
  nombre: "Verano 2026",
  tipo_descuento: "PORCENTAJE",
  valor: 20,
  fecha_desde: "2026-12-01",
  fecha_hasta: "2027-02-28",
  ids_planes: [1, 2],
};

describe("crearPromocionSchema", () => {
  it("guarda el código en mayúsculas y convierte las fechas", () => {
    expect(crearPromocionSchema.parse(alta)).toEqual({
      ...alta,
      codigo: "VERANO-26",
      fecha_desde: new Date("2026-12-01T00:00:00Z"),
      fecha_hasta: new Date("2027-02-28T00:00:00Z"),
    });
  });

  it("acepta un 99,99 % y un monto fijo mayor a 100", () => {
    expect(crearPromocionSchema.safeParse({ ...alta, valor: 99.99 }).success).toBe(true);
    expect(
      crearPromocionSchema.safeParse({ ...alta, tipo_descuento: "MONTO_FIJO", valor: 5000 }).success,
    ).toBe(true);
  });

  // El 100 % dejaría la cuota en 0, y un pago tiene que ser mayor a 0.
  it("rechaza un 100 %", () => {
    expect(crearPromocionSchema.safeParse({ ...alta, valor: 100 }).success).toBe(false);
  });

  it("acepta una promoción de un solo día", () => {
    expect(crearPromocionSchema.safeParse({ ...alta, fecha_hasta: "2026-12-01" }).success).toBe(true);
  });

  it.each([
    ["sin fecha desde", { fecha_desde: undefined }],
    ["sin fecha hasta", { fecha_hasta: undefined }],
    ["con la fecha hasta antes que la desde", { fecha_hasta: "2026-11-30" }],
    ["con una fecha que no existe", { fecha_desde: "2026-02-30" }],
    ["con un porcentaje mayor a 100", { valor: 100.01 }],
    ["con valor 0", { valor: 0 }],
    ["con valor -0", { valor: -0 }],
    ["con más de dos decimales", { valor: 10.001 }],
    ["con un tipo que no existe", { tipo_descuento: "DOS_POR_UNO" }],
    ["sin planes", { ids_planes: [] }],
    ["con un plan repetido", { ids_planes: [1, 1] }],
    ["con más de 50 planes", { ids_planes: Array.from({ length: 51 }, (_, indice) => indice + 1) }],
    ["con un código con espacios", { codigo: "VERANO 26" }],
    ["con un código con acentos", { codigo: "OTOÑO" }],
    ["con un código de más de 20", { codigo: "A".repeat(21) }],
    ["con un nombre sin letras", { nombre: "123" }],
    ["con un nombre de más de 60", { nombre: "a".repeat(61) }],
  ])("rechaza una promoción %s", (_caso, cambio) => {
    expect(crearPromocionSchema.safeParse({ ...alta, ...cambio }).success).toBe(false);
  });
});

describe("actualizarPromocionSchema", () => {
  it("acepta un solo campo", () => {
    expect(actualizarPromocionSchema.parse({ valor: 15 })).toEqual({ valor: 15 });
  });

  it.each([
    ["vacío", {}],
    ["con un porcentaje mayor a 100", { tipo_descuento: "PORCENTAJE", valor: 150 }],
    ["con las fechas invertidas", { fecha_desde: "2026-12-10", fecha_hasta: "2026-12-01" }],
  ])("rechaza un cambio %s", (_caso, cambio) => {
    expect(actualizarPromocionSchema.safeParse(cambio).success).toBe(false);
  });

  it("deja pasar un valor sin el tipo: el service lo revisa con el tipo guardado", () => {
    expect(actualizarPromocionSchema.safeParse({ valor: 150 }).success).toBe(true);
  });
});

describe("listarPromocionesQuerySchema y promocionIdParamSchema", () => {
  it("convierte el plan y pagina", () => {
    expect(listarPromocionesQuerySchema.parse({ estado: "VENCIDA", id_plan: "3" })).toEqual({
      estado: "VENCIDA",
      id_plan: 3,
      limit: 100,
      offset: 0,
    });
  });

  it.each([{ estado: "ACTIVO" }, { id_plan: "0" }, { limit: "101" }])("rechaza %j", (query) => {
    expect(listarPromocionesQuerySchema.safeParse(query).success).toBe(false);
  });

  it("valida el id", () => {
    expect(promocionIdParamSchema.parse({ id: "7" })).toEqual({ id: 7 });
    expect(promocionIdParamSchema.safeParse({ id: "07" }).success).toBe(false);
  });
});
