import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { listarAlumnos, obtenerAlumno } from "@/features/alumnos/api/alumnos-api";
import { listarAsistenciasAlumno } from "@/features/alumnos/api/asistencias-api";
import { clearSessionToken, setSessionToken } from "@/features/auth/api/session-token";
import { ALUMNOS_SEMILLA } from "@/mocks/data/alumnos";
import { db } from "@/mocks/db";
import { alumnosHandlers } from "@/mocks/handlers/alumnos";
import { MOCK_JWT } from "@/mocks/handlers/respuestas";

const server = setupServer(...alumnosHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => setSessionToken(MOCK_JWT));
afterEach(() => {
  server.resetHandlers();
  db.idUsuarioSesion = 3;
  db.alumnos = structuredClone(ALUMNOS_SEMILLA);
  clearSessionToken();
});


const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
describe("alumnosHandlers", () => {
  it("lista alumnos con el contrato vigente y respeta el límite", async () => {
    const respuesta = await listarAlumnos({
      busqueda: "",
      estado: "TODOS",
      id_plan: "",
      id_profesora: "",
      id_actividad: "",
      incluir_bajas: false,
      limit: 2,
      offset: 0,
    });

    expect(respuesta.items).toHaveLength(2);
    expect(respuesta.limit).toBe(2);
    expect(respuesta.offset).toBe(0);
    expect(respuesta.items.every((alumno) => alumno.id_alumno > 0)).toBe(true);
  });

  it("filtra por búsqueda de nombre", async () => {
    const respuesta = await listarAlumnos({
      busqueda: "Camila",
      estado: "TODOS",
      id_plan: "",
      id_profesora: "",
      id_actividad: "",
      incluir_bajas: false,
      limit: 25,
      offset: 0,
    });

    expect(respuesta.items.map((alumno) => alumno.nombre_completo)).toContain("Camila Pérez");
  });

  it("rechaza la consulta sin sesión", async () => {
    clearSessionToken();

    await expect(
      listarAlumnos({
        busqueda: "",
        estado: "TODOS",
        id_plan: "",
        id_profesora: "",
        id_actividad: "",
        incluir_bajas: false,
        limit: 25,
        offset: 0,
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("un alumno con plan de 5 días tiene exactamente 5 horarios asignados y trazabilidad en asistencias", async () => {
    const alumno = await obtenerAlumno(11);
    expect(alumno.inscripcion?.plan.nombre).toBe("Plan 5 días");
    expect(alumno.inscripcion?.horarios).toHaveLength(5);
    expect(alumno.inscripcion?.horarios.map((h) => h.dia_semana)).toEqual([1, 2, 3, 4, 5]);

    const { datos: asistencias, total } = await listarAsistenciasAlumno(11, "TODAS", 0);
    expect(total).toBeGreaterThanOrEqual(asistencias.length);
    expect(asistencias.length).toBeGreaterThan(0);
    const dias = new Set(asistencias.map((a) => DIAS[new Date(`${a.fecha}T12:00:00`).getDay()]));
    expect(dias.has("Lunes")).toBe(true);
    expect(dias.has("Martes")).toBe(true);
    expect(dias.has("Miércoles")).toBe(true);
    expect(dias.has("Jueves")).toBe(true);
    expect(dias.has("Viernes")).toBe(true);
    expect(asistencias.every((a) => a.actividad === "Funcional")).toBe(true);
    expect(asistencias.every((a) => a.profesora === "Lucía Gómez")).toBe(true);
  });

  it("un alumno con Plan Premium (5 días) tiene exactamente 5 horarios y asistencias trazables", async () => {
    const alumno = await obtenerAlumno(14);
    expect(alumno.inscripcion?.plan.nombre).toBe("Plan Premium");
    expect(alumno.inscripcion?.horarios).toHaveLength(5);
    expect(alumno.inscripcion?.horarios.map((h) => h.dia_semana)).toEqual([1, 2, 3, 4, 5]);

    const { datos: asistencias, total } = await listarAsistenciasAlumno(14, "TODAS", 0);
    expect(total).toBeGreaterThanOrEqual(asistencias.length);
    expect(asistencias.length).toBeGreaterThan(0);
    expect(asistencias.every((a) => a.actividad === "Acondicionamiento físico")).toBe(true);
    expect(asistencias.every((a) => a.profesora === "Lucía Gómez")).toBe(true);
  });

  it("un alumno con Plan Básico (2 días) tiene exactamente 2 horarios y asistencias en esos días", async () => {
    const alumno = await obtenerAlumno(12);
    expect(alumno.inscripcion?.plan.nombre).toBe("Plan Básico");
    expect(alumno.inscripcion?.horarios).toHaveLength(2);
    expect(alumno.inscripcion?.horarios.map((h) => h.dia_semana)).toEqual([2, 4]);

    const { datos: asistencias, total } = await listarAsistenciasAlumno(12, "TODAS", 0);
    expect(total).toBeGreaterThanOrEqual(asistencias.length);
    expect(asistencias.length).toBeGreaterThan(0);
    const dias = new Set(asistencias.map((a) => DIAS[new Date(`${a.fecha}T12:00:00`).getDay()]));
    expect(dias.has("Martes")).toBe(true);
    expect(dias.has("Jueves")).toBe(true);
    expect(dias.has("Lunes")).toBe(false);
    expect(dias.has("Miércoles")).toBe(false);
    expect(dias.has("Viernes")).toBe(false);
  });

  it("un alumno con Plan Intermedio (3 días) tiene exactamente 3 horarios y asistencias en esos días", async () => {
    const alumno = await obtenerAlumno(13);
    expect(alumno.inscripcion?.plan.nombre).toBe("Plan Intermedio");
    expect(alumno.inscripcion?.horarios).toHaveLength(3);
    expect(alumno.inscripcion?.horarios.map((h) => h.dia_semana)).toEqual([1, 3, 5]);

    const { datos: asistencias, total } = await listarAsistenciasAlumno(13, "TODAS", 0);
    expect(total).toBeGreaterThanOrEqual(asistencias.length);
    expect(asistencias.length).toBeGreaterThan(0);
    const dias = new Set(asistencias.map((a) => DIAS[new Date(`${a.fecha}T12:00:00`).getDay()]));
    expect(dias.has("Lunes")).toBe(true);
    expect(dias.has("Miércoles")).toBe(true);
    expect(dias.has("Viernes")).toBe(true);
    expect(dias.has("Martes")).toBe(false);
    expect(dias.has("Jueves")).toBe(false);
  });

  it("garantiza que cada plan con X días tiene exactamente X clases en todas las inscripciones", () => {
    for (const inscripcion of db.inscripciones) {
      const plan = db.planes.find((p) => p.id_plan === inscripcion.id_plan);
      if (!plan || plan.clases_por_semana === null) continue;
      expect(inscripcion.ids_horarios).toHaveLength(plan.clases_por_semana);
    }
  });
});
