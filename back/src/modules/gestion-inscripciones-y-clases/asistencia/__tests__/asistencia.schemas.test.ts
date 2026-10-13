import { describe, expect, it } from "vitest";
import { claseYAlumnoParamSchema, marcarAsistenciaSchema } from "../asistencia.schemas.js";

describe("asistencia.schemas", () => {
  it("valida ids de clase y alumno y exige un booleano", () => {
    expect(claseYAlumnoParamSchema.parse({ id: "20", idAlumno: "5" })).toEqual({ id: 20, idAlumno: 5 });
    expect(marcarAsistenciaSchema.parse({ asistio: true })).toEqual({ asistio: true });
    expect(marcarAsistenciaSchema.parse({ asistio: false })).toEqual({ asistio: false });
  });

  it("acepta observaciones de hasta 255 caracteres, con saltos de línea, y guarda como null las vacías", () => {
    expect(
      marcarAsistenciaSchema.parse({ asistio: true, observaciones: " Llegó tarde\nSe fue antes " }),
    ).toEqual({
      asistio: true,
      observaciones: "Llegó tarde\nSe fue antes",
    });
    expect(marcarAsistenciaSchema.parse({ asistio: true, observaciones: "" })).toEqual({
      asistio: true,
      observaciones: null,
    });
  });

  it.each([
    ["más largas que la columna", "a".repeat(256)],
    ["sin letras", "123"],
    ["con un carácter de control", "Tarde\u0000"],
    ["que no son texto", 5],
  ])("rechaza observaciones %s", (_caso, observaciones) => {
    expect(marcarAsistenciaSchema.safeParse({ asistio: true, observaciones }).success).toBe(false);
  });

  it("rechaza ids o valores de asistencia no booleanos", () => {
    expect(claseYAlumnoParamSchema.safeParse({ id: "01", idAlumno: "5" }).success).toBe(false);
    expect(claseYAlumnoParamSchema.safeParse({ id: "20", idAlumno: "0" }).success).toBe(false);
    expect(marcarAsistenciaSchema.safeParse({ asistio: "true" }).success).toBe(false);
    expect(marcarAsistenciaSchema.safeParse({ asistio: 1 }).success).toBe(false);
  });
});
