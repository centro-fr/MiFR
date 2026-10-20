import { describe, expect, it } from "vitest";
import { alumnoInsigniasParamsSchema, rankingAsistenciaQuerySchema } from "../insignia.schemas.js";

describe("alumnoInsigniasParamsSchema", () => {
  it("convierte el id del alumno", () => {
    expect(alumnoInsigniasParamsSchema.parse({ id: "5" })).toEqual({ id: 5 });
  });

  it.each(["0", "-1", "01", "1e1", " 5 ", "abc"])("rechaza el id %j", (id) => {
    expect(alumnoInsigniasParamsSchema.safeParse({ id }).success).toBe(false);
  });
});

describe("rankingAsistenciaQuerySchema", () => {
  it("sin filtros pagina de a 50", () => {
    expect(rankingAsistenciaQuerySchema.parse({})).toEqual({ limit: 50, offset: 0 });
  });

  it("acepta el período y la actividad", () => {
    expect(
      rankingAsistenciaQuerySchema.parse({ desde: "2026-10-01", hasta: "2026-10-01", actividad: "3" }),
    ).toEqual({
      desde: new Date("2026-10-01T00:00:00Z"),
      hasta: new Date("2026-10-01T00:00:00Z"),
      actividad: 3,
      limit: 50,
      offset: 0,
    });
  });

  it.each([
    { actividad: "0" },
    { actividad: "-3" },
    { desde: "2026-02-30" },
    { hasta: "20261001" },
    { limit: "0" },
    { limit: "101" },
    { offset: "-1" },
  ])("rechaza %j", (query) => {
    expect(rankingAsistenciaQuerySchema.safeParse(query).success).toBe(false);
  });

  it("rechaza desde posterior a hasta", () => {
    expect(() => rankingAsistenciaQuerySchema.parse({ desde: "2026-10-02", hasta: "2026-10-01" })).toThrow(
      "desde no puede ser posterior a hasta",
    );
  });
});
