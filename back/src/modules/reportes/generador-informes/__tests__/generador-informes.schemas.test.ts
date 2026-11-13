import { describe, expect, it } from "vitest";
import {
  estadisticasInscripcionesQuerySchema,
  estadisticasPlanesQuerySchema,
  informeAsistenciaQuerySchema,
  informeOcupacionQuerySchema,
  informeCobranzaQuerySchema,
  informeCuotasVencidasQuerySchema,
} from "../generador-informes.schemas.js";

describe("generador-informes.schemas", () => {
  describe("informeCuotasVencidasQuerySchema", () => {
    it("parsea query vacía con defaults de paginación", () => {
      const res = informeCuotasVencidasQuerySchema.parse({});
      expect(res).toEqual({
        limit: 50,
        offset: 0,
      });
    });

    it("parsea parámetros completos válidos", () => {
      const res = informeCuotasVencidasQuerySchema.parse({
        desde: "2026-09-01",
        hasta: "2026-09-30",
        id_profesora: "3",
        id_alumno: "10",
        id_plan: "2",
        limit: "20",
        offset: "40",
      });
      expect(res).toEqual({
        desde: new Date("2026-09-01T00:00:00Z"),
        hasta: new Date("2026-09-30T00:00:00Z"),
        id_profesora: 3,
        id_alumno: 10,
        id_plan: 2,
        limit: 20,
        offset: 40,
      });
    });

    it("rechaza si desde es posterior a hasta", () => {
      expect(() =>
        informeCuotasVencidasQuerySchema.parse({
          desde: "2026-10-15",
          hasta: "2026-10-10",
        }),
      ).toThrow("desde no puede ser posterior a hasta");
    });
  });

  describe("informeCobranzaQuerySchema", () => {
    it("parsea query vacía con paginación por defecto", () => {
      const res = informeCobranzaQuerySchema.parse({});
      expect(res).toEqual({
        limit: 50,
        offset: 0,
      });
    });

    it("parsea filtros de forma de pago y rango", () => {
      const res = informeCobranzaQuerySchema.parse({
        desde: "2026-10-01",
        hasta: "2026-10-19",
        forma_pago: "EFECTIVO",
        id_profesora: "5",
      });
      expect(res.forma_pago).toBe("EFECTIVO");
      expect(res.id_profesora).toBe(5);
    });

    it("rechaza forma de pago inválida", () => {
      expect(() =>
        informeCobranzaQuerySchema.parse({
          forma_pago: "CHEQUE",
        }),
      ).toThrow();
    });

    it("rechaza rango invertido", () => {
      expect(() =>
        informeCobranzaQuerySchema.parse({
          desde: "2026-10-20",
          hasta: "2026-10-05",
        }),
      ).toThrow("desde no puede ser posterior a hasta");
    });
  });

  describe("estadisticasPlanesQuerySchema", () => {
    it("parsea query vacía", () => {
      expect(estadisticasPlanesQuerySchema.parse({})).toEqual({});
    });

    it("parsea id_actividad e id_profesora", () => {
      const res = estadisticasPlanesQuerySchema.parse({
        id_actividad: "2",
        id_profesora: "4",
      });
      expect(res).toEqual({ id_actividad: 2, id_profesora: 4 });
    });

    it("rechaza IDs inválidos", () => {
      expect(() => estadisticasPlanesQuerySchema.parse({ id_actividad: "abc" })).toThrow();
      expect(() => estadisticasPlanesQuerySchema.parse({ id_actividad: "-1" })).toThrow();
    });
  });

  describe("estadisticasInscripcionesQuerySchema", () => {
    it("parsea query vacía", () => {
      expect(estadisticasInscripcionesQuerySchema.parse({})).toEqual({});
    });

    it("parsea anio de 4 dígitos", () => {
      const res = estadisticasInscripcionesQuerySchema.parse({ anio: "2026" });
      expect(res.anio).toBe(2026);
    });

    it("rechaza anio inválido o fuera de rango", () => {
      expect(() => estadisticasInscripcionesQuerySchema.parse({ anio: "99" })).toThrow();
      expect(() => estadisticasInscripcionesQuerySchema.parse({ anio: "1850" })).toThrow();
    });

    it("rechaza fechas invertidas", () => {
      expect(() =>
        estadisticasInscripcionesQuerySchema.parse({
          desde: "2026-12-01",
          hasta: "2026-01-01",
        }),
      ).toThrow("desde no puede ser posterior a hasta");
    });
  });

  describe("informeAsistenciaQuerySchema (US-33)", () => {
    it("sin filtros no incluye bajas y pagina de a 50", () => {
      expect(informeAsistenciaQuerySchema.parse({})).toEqual({ incluir_bajas: false, limit: 50, offset: 0 });
    });

    it("combina período, alumno, profesora, actividad e incluir_bajas", () => {
      expect(
        informeAsistenciaQuerySchema.parse({
          desde: "2026-10-01",
          hasta: "2026-10-31",
          id_alumno: "5",
          id_profesora: "2",
          id_actividad: "3",
          incluir_bajas: "true",
          limit: "10",
          offset: "20",
        }),
      ).toEqual({
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-31T00:00:00Z"),
        id_alumno: 5,
        id_profesora: 2,
        id_actividad: 3,
        incluir_bajas: true,
        limit: 10,
        offset: 20,
      });
    });

    it.each([
      { id_alumno: "0" },
      { id_profesora: "-1" },
      { id_actividad: "1e1" },
      { incluir_bajas: "si" },
      { incluir_bajas: "1" },
      { desde: "2026-02-30" },
      { limit: "101" },
    ])("rechaza %j", (query) => {
      expect(informeAsistenciaQuerySchema.safeParse(query).success).toBe(false);
    });

    it("rechaza fechas invertidas", () => {
      expect(() => informeAsistenciaQuerySchema.parse({ desde: "2026-10-31", hasta: "2026-10-01" })).toThrow(
        "desde no puede ser posterior a hasta",
      );
    });
  });

  describe("informeOcupacionQuerySchema (US-37)", () => {
    it("acepta los filtros por actividad, profesora y modalidad", () => {
      expect(
        informeOcupacionQuerySchema.parse({
          id_actividad: "3",
          id_profesora: "2",
          modalidad: "PERSONALIZADA",
        }),
      ).toEqual({ id_actividad: 3, id_profesora: 2, modalidad: "PERSONALIZADA" });
    });

    it.each([{ modalidad: "grupal" }, { modalidad: "OTRA" }, { id_actividad: "01" }])(
      "rechaza %j",
      (query) => {
        expect(informeOcupacionQuerySchema.safeParse(query).success).toBe(false);
      },
    );
  });
});
