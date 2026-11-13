import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setSessionToken, clearSessionToken } from "@/features/auth/api/session-token";
import { db } from "@/mocks/db";
import { MOCK_JWT } from "@/mocks/handlers/respuestas";
import { rankingAsistenciaHandlers } from "@/mocks/handlers/ranking-asistencia";
import { obtenerRankingAsistencia } from "../ranking-asistencia-api";

const server = setupServer(...rankingAsistenciaHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => setSessionToken(MOCK_JWT));
afterEach(() => {
  server.resetHandlers();
  db.idUsuarioSesion = 3;
  clearSessionToken();
});
afterAll(() => server.close());

describe("obtenerRankingAsistencia (US-30)", () => {
  it.each([
    ["propietaria", 3],
    ["profesora", 1],
    ["alumno", 4],
    ["tutor", 8],
  ])("permite consultar el ranking como %s", async (_rol, idUsuario) => {
    db.idUsuarioSesion = idUsuario;

    const ranking = await obtenerRankingAsistencia();

    expect(ranking.datos.length).toBeGreaterThan(0);
    expect(ranking.datos.every((fila) => fila.clases_previstas >= ranking.minimo_clases)).toBe(true);
    expect(ranking.datos.every((fila) => !("dni" in fila) && !("email" in fila))).toBe(true);
  });

  it("ordena por porcentaje, asistencias y nombre", async () => {
    const ranking = await obtenerRankingAsistencia();

    // Lucas Benítez y Valentina Herrera empatan en 100 % con 12 clases: desempata el apellido. Lo mismo
    // Benjamín López y Franco Navarro con 87,5 % y 7 clases.
    expect(ranking.datos.map((fila) => fila.porcentaje_asistencia)).toEqual([100, 100, 90, 87.5, 87.5, 75, 66.67, 50]);
    expect(ranking.datos.map((fila) => fila.apellido).slice(0, 2)).toEqual(["Benítez", "Herrera"]);
    expect(ranking.datos.map((fila) => fila.apellido).slice(3, 5)).toEqual(["López", "Navarro"]);
    expect(ranking.datos.map((fila) => fila.posicion)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("envía el período opcional al endpoint", async () => {
    const ranking = await obtenerRankingAsistencia({ desde: "2026-11-01", hasta: "2026-11-30" });

    expect(ranking.periodo.desde).toBe("2026-11-01");
  });
});
