import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { alumnosHandlers } from "@/mocks/handlers/alumnos";
import { db } from "@/mocks/db";
import { clearSessionToken, setSessionToken } from "@/features/auth/api/session-token";
import { MOCK_JWT } from "@/mocks/handlers/respuestas";
import { obtenerPanelAlumno } from "../panel-alumno-api";

const server = setupServer(...alumnosHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  db.idUsuarioSesion = 3;
  clearSessionToken();
});
beforeEach(() => setSessionToken(MOCK_JWT));
afterAll(() => server.close());

describe("obtenerPanelAlumno (US-29)", () => {
  it.each([
    [4, "Camila", "Plan Básico"],
    [8, "Lucía", "Plan Básico"],
    [3, "Sofía", "Plan Básico"],
  ])("resuelve el panel para la sesión mock %s", async (idUsuario, nombre, planEsperado) => {
    db.idUsuarioSesion = idUsuario;

    const panel = await obtenerPanelAlumno();

    expect(panel.alumno.nombre).toBe(nombre);
    expect(panel.planes[0]?.nombre ?? null).toBe(planEsperado);
  });

  it("mantiene el historial vacío cuando todavía no hay asistencias", async () => {
    db.idUsuarioSesion = 4;

    const panel = await obtenerPanelAlumno();

    expect(panel.proximas_clases.length).toBeGreaterThan(0);
    expect(panel.historial_asistencias).toEqual([]);
  });
});
