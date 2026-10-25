import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { listarAlumnos } from "../alumnos-api";
import { clearSessionToken, setSessionToken } from "../../../auth/api/session-token";
import { ALUMNOS_SEMILLA, USUARIOS_PERSONAS_SEMILLA } from "../../../../mocks/data/alumnos";
import { inscripcionesSemilla } from "../../../../mocks/data/inscripciones";
import { db } from "../../../../mocks/db";
import { alumnosHandlers } from "../../../../mocks/handlers/alumnos";
import { MOCK_JWT } from "../../../../mocks/handlers/respuestas";

const server = setupServer(...alumnosHandlers);
const authHeaders = { Authorization: `Bearer ${MOCK_JWT}` };

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  clearSessionToken();
  db.idUsuarioSesion = 3;
  db.alumnos = structuredClone(ALUMNOS_SEMILLA);
  db.usuariosPersonas = structuredClone(USUARIOS_PERSONAS_SEMILLA);
  db.inscripciones = inscripcionesSemilla();
});

async function solicitarAlumnos(parametros = ""): Promise<Response> {
  return fetch(`http://localhost/api/v1/alumnos${parametros}`, { headers: authHeaders });
}

async function actualizarAlumno(id: number, cambios: Record<string, unknown>): Promise<Response> {
  return fetch(`http://localhost/api/v1/alumnos/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
}

describe("alumnosHandlers", () => {
  it("lista con filtros opcionales vacíos usando el contrato actual de la API", async () => {
    setSessionToken(MOCK_JWT);
    try {
      const respuesta = await listarAlumnos({
        busqueda: "",
        estado: "TODOS",
        id_plan: "",
        id_profesora: "",
        id_actividad: "",
        incluir_bajas: false,
        limit: 25,
        offset: 0,
      });

      expect(respuesta.total).toBe(21);
      expect(respuesta.items).toHaveLength(21);
      expect(respuesta.items.some((alumno) => alumno.estado === "BAJA")).toBe(false);
    } finally {
      clearSessionToken();
    }
  });

  it("busca nombres sin distinguir mayúsculas ni acentos", async () => {
    const respuesta = await solicitarAlumnos("?busqueda=perez");
    const cuerpo = (await respuesta.json()) as {
      datos: { usuario: { nombre: string; apellido: string } }[];
    };

    expect(respuesta.status).toBe(200);
    expect(cuerpo.datos.map(({ usuario }) => `${usuario.nombre} ${usuario.apellido}`)).toContain("Camila Pérez");
  });

  it("busca por coincidencia exacta de DNI", async () => {
    const respuesta = await solicitarAlumnos("?dni=35123456");
    const cuerpo = (await respuesta.json()) as {
      datos: { usuario: { nombre: string; apellido: string } }[];
    };

    expect(cuerpo.datos.map(({ usuario }) => `${usuario.nombre} ${usuario.apellido}`)).toEqual(["Camila Pérez"]);
  });

  it("excluye bajas por defecto y las devuelve al filtrar el estado BAJA", async () => {
    const respuestaPredeterminada = await solicitarAlumnos();
    const respuestaBajas = await solicitarAlumnos("?estado=BAJA");
    const predeterminados = (await respuestaPredeterminada.json()) as {
      datos: { estado: string }[];
    };
    const bajas = (await respuestaBajas.json()) as {
      datos: { usuario: { nombre: string; apellido: string } }[];
    };

    expect(predeterminados.datos.some((alumno) => alumno.estado === "BAJA")).toBe(false);
    expect(bajas.datos.map(({ usuario }) => `${usuario.nombre} ${usuario.apellido}`)).toEqual(["Micaela García"]);
  });

  it("incluye bajas junto con alumnos activos cuando se solicita", async () => {
    const respuesta = await solicitarAlumnos("?incluirBajas=true");
    const cuerpo = (await respuesta.json()) as { datos: { estado: string }[]; total: number };

    expect(cuerpo.datos.some((alumno) => alumno.estado === "BAJA")).toBe(true);
    expect(cuerpo.total).toBe(22);
  });

  it("devuelve la ficha con tutor e inscripciones, sin el antiguo historial de cobros", async () => {
    const respuesta = await fetch("http://localhost/api/v1/alumnos/2", { headers: authHeaders });
    const alumno = (await respuesta.json()) as {
      responsable: { nombre: string } | null;
      inscripciones: unknown[];
      historial_cobros?: unknown[];
    };

    expect(respuesta.status).toBe(200);
    expect(alumno.responsable?.nombre).toBe("Paula");
    expect(alumno.inscripciones).toBeInstanceOf(Array);
    expect(alumno).not.toHaveProperty("historial_cobros");
  });

  it("permite a una profesora actualizar el contacto, pero no los datos personales", async () => {
    db.idUsuarioSesion = 1;
    const actualizacionContacto = await actualizarAlumno(1, { telefono: "11 5555-9999" });
    const actualizacionPersonal = await actualizarAlumno(1, { nombre: "Nombre no permitido" });

    expect(actualizacionContacto.status).toBe(200);
    expect(actualizacionPersonal.status).toBe(403);
  });

  it("desvincula al tutor cuando una persona menor pasa a ser mayor de edad", async () => {
    const respuesta = await actualizarAlumno(2, {
      fecha_nacimiento: "2000-08-22",
      email: "mateo.adulto@example.com",
    });
    const alumno = (await respuesta.json()) as {
      responsable: unknown;
      id_usuario_responsable: number | null;
    };

    expect(respuesta.status).toBe(200);
    expect(alumno.responsable).toBeNull();
    expect(alumno.id_usuario_responsable).toBeNull();
  });
});