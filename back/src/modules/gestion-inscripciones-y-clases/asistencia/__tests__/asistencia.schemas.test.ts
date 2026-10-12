import { describe, expect, it } from "vitest";
import { claseYAlumnoParamSchema, marcarAsistenciaSchema } from "../asistencia.schemas.js";

describe("asistencia.schemas", () => {
  it("valida ids de clase y alumno y exige un booleano", () => {
    expect(claseYAlumnoParamSchema.parse({ id: "20", idAlumno: "5" })).toEqual({ id: 20, idAlumno: 5 });
    expect(marcarAsistenciaSchema.parse({ asistio: true })).toEqual({ asistio: true });
    expect(marcarAsistenciaSchema.parse({ asistio: false })).toEqual({ asistio: false });
  });

  it("rechaza ids o valores de asistencia no booleanos", () => {
    expect(claseYAlumnoParamSchema.safeParse({ id: "01", idAlumno: "5" }).success).toBe(false);
    expect(claseYAlumnoParamSchema.safeParse({ id: "20", idAlumno: "0" }).success).toBe(false);
    expect(marcarAsistenciaSchema.safeParse({ asistio: "true" }).success).toBe(false);
    expect(marcarAsistenciaSchema.safeParse({ asistio: 1 }).success).toBe(false);
  });
});
