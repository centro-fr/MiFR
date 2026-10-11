import { describe, expect, it } from "vitest";
import {
  actualizarHorariosSchema,
  crearInscripcionSchema,
  darDeBajaAlumnoSchema,
  listarInscripcionesQuerySchema,
} from "../inscripcion.schemas.js";

const alta = { id_alumno: 5, id_plan: 1, id_profesora: 3, ids_horarios: [8] };

describe("crearInscripcionSchema", () => {
  it("acepta peso y talla opcionales y rechaza valores fuera de rango, en texto o incompletos", () => {
    expect(crearInscripcionSchema.parse(alta)).not.toHaveProperty("medidas");
    expect(
      crearInscripcionSchema.parse({ ...alta, medidas: { peso_kg: 62.5, talla_cm: 168 } }),
    ).toMatchObject({
      medidas: { peso_kg: 62.5, talla_cm: 168 },
    });
    for (const medidas of [
      { peso_kg: 62.5 },
      { peso_kg: 0, talla_cm: 168 },
      { peso_kg: 62.5, talla_cm: 1.68 },
      { peso_kg: "62", talla_cm: 168 },
      { peso_kg: 62.555, talla_cm: 168 },
      null,
    ]) {
      expect(crearInscripcionSchema.safeParse({ ...alta, medidas }).success).toBe(false);
    }
  });

  it("completa sin_cargo en false y convierte las fechas a días UTC", () => {
    expect(crearInscripcionSchema.parse({ ...alta, fecha_inicio: "2026-11-02" })).toMatchObject({
      sin_cargo: false,
      fecha_inicio: new Date("2026-11-02T00:00:00Z"),
    });
  });

  it.each([
    ["sin horarios", { ids_horarios: [] }],
    ["con un horario repetido", { ids_horarios: [8, 8] }],
    ["con más de siete horarios", { ids_horarios: [1, 2, 3, 4, 5, 6, 7, 8] }],
    ["con un id -0", { id_alumno: -0 }],
    ["con un id en texto", { id_plan: "1" }],
    ["con una fecha mal formada", { fecha_inicio: "02/11/2026" }],
    ["sin plan", { id_plan: undefined }],
  ])("rechaza una inscripción %s", (_caso, cambio) => {
    expect(crearInscripcionSchema.safeParse({ ...alta, ...cambio }).success).toBe(false);
  });
});

describe("darDeBajaAlumnoSchema", () => {
  it.each(["ABANDONO", "MUDANZA", "SALUD", "ECONOMICO", "OTRO"])("acepta el motivo %s", (motivo_baja) => {
    expect(darDeBajaAlumnoSchema.safeParse({ motivo_baja }).success).toBe(true);
  });

  it("rechaza CAMBIO_PLAN, que lo pone el cambio de plan, y la baja sin motivo", () => {
    expect(darDeBajaAlumnoSchema.safeParse({ motivo_baja: "CAMBIO_PLAN" }).success).toBe(false);
    expect(darDeBajaAlumnoSchema.safeParse({}).success).toBe(false);
  });
});

describe("actualizarHorariosSchema y listarInscripcionesQuerySchema", () => {
  it("exige al menos un horario", () => {
    expect(actualizarHorariosSchema.safeParse({ ids_horarios: [] }).success).toBe(false);
  });

  it("convierte los filtros de la query y rechaza un estado desconocido", () => {
    expect(listarInscripcionesQuerySchema.parse({ id_plan: "1", estado: "ACTIVA" })).toEqual({
      id_plan: 1,
      estado: "ACTIVA",
      limit: 100,
      offset: 0,
    });
    expect(listarInscripcionesQuerySchema.safeParse({ estado: "PENDIENTE" }).success).toBe(false);
  });

  it("pagina el listado con un tope de 100 por pedido", () => {
    expect(listarInscripcionesQuerySchema.parse({ limit: "20", offset: "40" })).toMatchObject({
      limit: 20,
      offset: 40,
    });
    expect(listarInscripcionesQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});
