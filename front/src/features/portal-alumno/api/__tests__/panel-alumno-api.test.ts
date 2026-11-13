import { http, HttpResponse } from "msw";
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

  it("acepta la respuesta del back con un plan sin cuota paga, sin vencimiento", async () => {
    server.use(
      http.get("*/api/v1/alumnos/mi-panel", () =>
        HttpResponse.json({
          id_alumno: 9,
          alumno: { nombre: "Mateo", apellido: "Ríos" },
          planes: [
            {
            id_inscripcion: 31,
            nombre: "Personalizado 2 días",
            tipo: "MENSUAL",
            clases_por_semana: 2,
            profesora: "Carla Ruiz",
            actividades: ["Entrenamiento Personalizado"],
            estado_cuota: "PENDIENTE_DE_PAGO",
            fecha_vencimiento: null,
            dias_restantes: null,
            },
          ],
          proximas_clases: [
            {
              id_horario: 4,
              id_inscripcion: 31,
              fecha: "2026-11-16",
              hora_inicio: "18:00",
              hora_fin: "19:00",
              actividad: "Funcional",
              profesora: "Carla Ruiz",
              cupo_disponible: null,
            },
          ],
          historial_asistencias: [
            { id_clase: 12, id_inscripcion: 31, fecha: "2026-11-09", actividad: "Funcional", profesora: "Lucía Gómez", estado: "AUSENTE" },
          ],
        }),
      ),
    );

    const panel = await obtenerPanelAlumno(9);

    expect(panel.planes[0]).toMatchObject({ id_inscripcion: 31, estado_cuota: "PENDIENTE_DE_PAGO", fecha_vencimiento: null });
    expect(panel.proximas_clases[0].id_horario).toBe(4);
    expect(panel.historial_asistencias[0].id_clase).toBe(12);
  });

  it("rechaza un estado de cuota que el back no manda", async () => {
    server.use(
      http.get("*/api/v1/alumnos/mi-panel", () =>
        HttpResponse.json({
          id_alumno: 9,
          alumno: { nombre: "Mateo", apellido: "Ríos" },
          planes: [
            {
            id_inscripcion: 31,
            nombre: "Intermedio",
            tipo: "MENSUAL",
            clases_por_semana: 2,
            profesora: "Carla Ruiz",
            actividades: ["Funcional"],
            estado_cuota: "EN_GRACIA",
            fecha_vencimiento: "2026-11-20",
            dias_restantes: 7,
            },
          ],
          proximas_clases: [],
          historial_asistencias: [],
        }),
      ),
    );

    await expect(obtenerPanelAlumno()).rejects.toThrow();
  });
});
