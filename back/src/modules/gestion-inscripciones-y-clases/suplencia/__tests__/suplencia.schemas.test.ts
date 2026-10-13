import { describe, expect, it } from "vitest";
import {
  cambiarSuplenciaSchema,
  listarSuplenciasQuerySchema,
  registrarSuplenciaSchema,
  suplenciaParamSchema,
} from "../suplencia.schemas.js";

const valida = { id_horario: 4, fecha_clase: "2026-10-12", id_profesora_suplente: 9 };

describe("registrarSuplenciaSchema", () => {
  it("convierte la fecha y deja el motivo vacío en NULL", () => {
    expect(registrarSuplenciaSchema.parse({ ...valida, motivo: "  " })).toEqual({
      id_horario: 4,
      fecha_clase: new Date("2026-10-12T00:00:00Z"),
      id_profesora_suplente: 9,
      motivo: null,
    });
  });

  it("acepta un motivo de varias líneas", () => {
    expect(registrarSuplenciaSchema.parse({ ...valida, motivo: "Médico\nVuelve el lunes" }).motivo).toBe(
      "Médico\nVuelve el lunes",
    );
  });

  it.each([
    ["sin horario", { ...valida, id_horario: undefined }],
    ["horario -0", { ...valida, id_horario: -0 }],
    ["horario decimal", { ...valida, id_horario: 4.5 }],
    ["horario en texto", { ...valida, id_horario: "4" }],
    ["suplente 0", { ...valida, id_profesora_suplente: 0 }],
    ["suplente fuera de INTEGER", { ...valida, id_profesora_suplente: 2_147_483_648 }],
    ["fecha que no existe", { ...valida, fecha_clase: "2026-02-30" }],
    ["fecha con hora", { ...valida, fecha_clase: "2026-10-12T10:00:00Z" }],
    ["motivo sin letras", { ...valida, motivo: "123" }],
    ["motivo con caracteres de control", { ...valida, motivo: "Viaje\u0000" }],
    ["motivo más largo que la columna", { ...valida, motivo: "a".repeat(256) }],
  ])("rechaza %s", (_caso, entrada) => {
    expect(registrarSuplenciaSchema.safeParse(entrada).success).toBe(false);
  });
});

describe("cambiarSuplenciaSchema", () => {
  it("acepta solo la suplente o solo el motivo", () => {
    expect(cambiarSuplenciaSchema.parse({ id_profesora_suplente: 10 })).toEqual({
      id_profesora_suplente: 10,
    });
    expect(cambiarSuplenciaSchema.parse({ motivo: "" })).toEqual({ motivo: null });
  });

  it("rechaza un cuerpo vacío o con campos que no se pueden cambiar", () => {
    expect(cambiarSuplenciaSchema.safeParse({}).success).toBe(false);
    expect(cambiarSuplenciaSchema.safeParse({ id_prof_ausente: 8 }).success).toBe(false);
  });
});

describe("suplenciaParamSchema", () => {
  it("acepta un id decimal y rechaza otras formas", () => {
    expect(suplenciaParamSchema.parse({ idClase: "20" })).toEqual({ idClase: 20 });
    for (const idClase of ["020", "-0", "1e1", " 20"]) {
      expect(suplenciaParamSchema.safeParse({ idClase }).success).toBe(false);
    }
  });
});

describe("listarSuplenciasQuerySchema", () => {
  it("convierte los filtros y aplica la paginación por defecto", () => {
    expect(
      listarSuplenciasQuerySchema.parse({
        desde: "2026-10-01",
        hasta: "2026-10-31",
        id_profesora: "8",
        id_actividad: "3",
      }),
    ).toEqual({
      desde: new Date("2026-10-01T00:00:00Z"),
      hasta: new Date("2026-10-31T00:00:00Z"),
      id_profesora: 8,
      id_actividad: 3,
      limit: 50,
      offset: 0,
    });
  });

  it("acepta el mismo día como desde y hasta", () => {
    expect(listarSuplenciasQuerySchema.safeParse({ desde: "2026-10-12", hasta: "2026-10-12" }).success).toBe(
      true,
    );
  });

  it.each([
    ["desde posterior a hasta", { desde: "2026-10-31", hasta: "2026-10-01" }],
    ["fecha inválida", { desde: "2026-13-01" }],
    ["profesora con cero adelante", { id_profesora: "08" }],
    ["limit por encima del tope", { limit: "101" }],
  ])("rechaza %s", (_caso, query) => {
    expect(listarSuplenciasQuerySchema.safeParse(query).success).toBe(false);
  });
});
