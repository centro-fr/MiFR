import { describe, expect, it } from "vitest";
import {
  actualizarHorariosSchema,
  crearInscripcionSchema,
  darDeBajaAlumnoSchema,
  listarInscripcionesQuerySchema,
} from "../inscripcion.schemas.js";

const alta = { id_alumno: 5, id_plan: 1, id_profesora: 3, ids_horarios: [8] };

describe("crearInscripcionSchema", () => {
  it("completa sin_cargo en false y convierte las fechas a días UTC", () => {
    expect(crearInscripcionSchema.parse({ ...alta, fecha_inicio: "2026-11-02" })).toMatchObject({
      sin_cargo: false,
      fecha_inicio: new Date("2026-11-02T00:00:00Z"),
    });
  });

  it.each([
    ["sin horarios", { ids_horarios: [] }],
    ["con un horario repetido", { ids_horarios: [8, 8] }],
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
    });
    expect(listarInscripcionesQuerySchema.safeParse({ estado: "PENDIENTE" }).success).toBe(false);
  });
});
