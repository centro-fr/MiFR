import { describe, expect, it } from "vitest";
import {
  listarAlumnosInactivosQuerySchema,
  registrarSeguimientoSchema,
  seguimientoParamSchema,
} from "../detector-inactividad.schemas.js";

describe("schemas de alumnos inactivos", () => {
  it("listarAlumnosInactivosQuerySchema convierte los filtros y pone la paginación por defecto", () => {
    expect(
      listarAlumnosInactivosQuerySchema.parse({
        id_profesora: "3",
        id_plan: "2",
        minimo_inasistencias: "5",
        estado_gestion: "PENDIENTE",
      }),
    ).toEqual({
      id_profesora: 3,
      id_plan: 2,
      minimo_inasistencias: 5,
      estado_gestion: "PENDIENTE",
      limit: 50,
      offset: 0,
    });
    expect(listarAlumnosInactivosQuerySchema.parse({})).toEqual({ limit: 50, offset: 0 });
  });

  it.each([
    ["true", true],
    ["false", false],
  ])("listarAlumnosInactivosQuerySchema convierte incluir_ignorados=%s a booleano", (valor, esperado) => {
    expect(listarAlumnosInactivosQuerySchema.parse({ incluir_ignorados: valor }).incluir_ignorados).toBe(
      esperado,
    );
  });

  it.each([
    { id_profesora: "0" },
    { id_plan: "-1" },
    { minimo_inasistencias: "0" },
    { minimo_inasistencias: "31" },
    { minimo_inasistencias: "-0" },
    { minimo_inasistencias: "1.5" },
    { minimo_inasistencias: " 3" },
    { minimo_inasistencias: "1e1" },
    { estado_gestion: "pendiente" },
    { estado_gestion: "BAJA" },
    { limit: "101" },
  ])("listarAlumnosInactivosQuerySchema rechaza %j", (query) => {
    expect(listarAlumnosInactivosQuerySchema.safeParse(query).success).toBe(false);
  });

  it("seguimientoParamSchema convierte el id de la inscripción y rechaza uno inválido", () => {
    expect(seguimientoParamSchema.parse({ idInscripcion: "12" })).toEqual({ idInscripcion: 12 });
    expect(seguimientoParamSchema.safeParse({ idInscripcion: "01" }).success).toBe(false);
  });

  it.each(["CONTACTADO", "GESTIONADO", "IGNORADO"])("registrarSeguimientoSchema acepta %s", (estado) => {
    expect(registrarSeguimientoSchema.parse({ estado })).toEqual({ estado });
  });

  it.each([{}, { estado: "PENDIENTE" }, { estado: "contactado" }, { estado: 1 }])(
    "registrarSeguimientoSchema rechaza %j: pendiente es quitar la marca",
    (cuerpo) => {
      expect(registrarSeguimientoSchema.safeParse(cuerpo).success).toBe(false);
    },
  );
});
