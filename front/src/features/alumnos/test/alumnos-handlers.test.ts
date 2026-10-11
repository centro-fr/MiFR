import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { listarAlumnos } from "@/features/alumnos/api/alumnos-api";
import { clearSessionToken, setSessionToken } from "@/features/auth/api/session-token";
import { actualizarAlumnoSchema, type ActualizarAlumnoInput } from "@/features/alumnos/schemas/alumno";
import { ALUMNOS_SEMILLA } from "@/mocks/data/alumnos";
import { db } from "@/mocks/db";
import { alumnosHandlers } from "@/mocks/handlers/alumnos";
import { MOCK_JWT } from "@/mocks/handlers/respuestas";

const server = setupServer(...alumnosHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  db.idUsuarioSesion = 3;
  db.alumnos = structuredClone(ALUMNOS_SEMILLA);
});

async function solicitarAlumnos(parametros = ""): Promise<Response> {
  return fetch(`http://localhost/api/v1/alumnos${parametros}`, {
    headers: { Authorization: `Bearer ${MOCK_JWT}` },
  });
}

function cuerpoActualizacion(idAlumno = 1): ActualizarAlumnoInput {
  const alumno = structuredClone(db.alumnos.find((item) => item.id_alumno === idAlumno));
  if (!alumno) throw new Error("Falta el alumno de prueba");
  return actualizarAlumnoSchema.parse({
    usuario: {
      ...alumno.usuario,
      dni: alumno.usuario.dni ?? "",
      telefono: alumno.usuario.telefono ?? "",
      email: alumno.usuario.email ?? "",
    },
    tutor: alumno.tutor,
    cont_emerg_nombre: alumno.cont_emerg_nombre,
    cont_emerg_telefono: alumno.cont_emerg_telefono,
    apto_medico: alumno.apto_medico,
    fecha_apto_medico: alumno.fecha_apto_medico,
    observaciones: alumno.observaciones,
    id_plan: alumno.inscripcion?.plan?.id_plan ?? null,
    id_horarios: alumno.inscripcion?.horarios.map((horario) => horario.id_horario) ?? [],
  });
}

describe("alumnosHandlers", () => {
  it("lista correctamente con filtros opcionales vacíos desde la interfaz", async () => {
    setSessionToken(MOCK_JWT);
    try {
      const respuesta = await listarAlumnos({
        q: "",
        estado: "TODOS",
        id_plan: "",
        id_profesora: "",
        id_actividad: "",
        estado_cuota: "",
        incluir_bajas: false,
        limit: 25,
        offset: 0,
      });

      expect(respuesta.total).toBe(3);
      expect(respuesta.items).toHaveLength(3);
    } finally {
      clearSessionToken();
    }
  });

  it("busca nombres sin distinguir mayúsculas ni acentos", async () => {
    const respuesta = await solicitarAlumnos("?q=perez");
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo.items.map((alumno: { nombre_completo: string }) => alumno.nombre_completo)).toContain(
      "Camila Pérez",
    );
  });

  it("prioriza la coincidencia exacta de DNI e identificador", async () => {
    const porDni = await (await solicitarAlumnos("?q=35123456")).json();
    const porIdentificador = await (await solicitarAlumnos("?q=3")).json();

    expect(porDni.items.map((alumno: { nombre_completo: string }) => alumno.nombre_completo)).toEqual([
      "Camila Pérez",
    ]);
    expect(
      porIdentificador.items.map((alumno: { nombre_completo: string }) => alumno.nombre_completo),
    ).toEqual(["Julián Fernández"]);
  });

  it("excluye las bajas por defecto y las devuelve al filtrar ese estado", async () => {
    const respuestaPredeterminada = await solicitarAlumnos();
    const respuestaBajas = await solicitarAlumnos("?estado=BAJA");
    const predeterminados = await respuestaPredeterminada.json();
    const bajas = await respuestaBajas.json();

    expect(predeterminados.items.some((alumno: { estado: string }) => alumno.estado === "BAJA")).toBe(false);
    expect(bajas.items.map((alumno: { nombre_completo: string }) => alumno.nombre_completo)).toEqual([
      "Micaela García",
    ]);
  });

  it("incluye bajas junto con alumnos activos cuando se activa el filtro", async () => {
    const respuesta = await solicitarAlumnos("?incluir_bajas=true");
    const cuerpo = await respuesta.json();

    expect(cuerpo.items.map((alumno: { estado: string }) => alumno.estado)).toContain("BAJA");
    expect(cuerpo.items).toHaveLength(4);
  });

  it("limita a la profesora a los alumnos que tiene a cargo", async () => {
    db.idUsuarioSesion = 1;
    const respuesta = await solicitarAlumnos();
    const cuerpo = await respuesta.json();

    expect(cuerpo.items.map((alumno: { nombre_completo: string }) => alumno.nombre_completo)).toEqual([
      "Camila Pérez",
      "Valentina López",
    ]);
  });

  it("no devuelve el historial de cobros a una profesora", async () => {
    db.idUsuarioSesion = 1;
    const respuesta = await fetch("http://localhost/api/v1/alumnos/1", {
      headers: { Authorization: `Bearer ${MOCK_JWT}` },
    });
    const alumno = await respuesta.json();

    expect(alumno.historial_cobros).toEqual([]);
  });

  it("permite a la profesora actualizar el contacto sin permitir cambios personales", async () => {
    db.idUsuarioSesion = 1;
    const contacto = cuerpoActualizacion();
    contacto.usuario.telefono = "11 5555-9999";
    const actualizacionContacto = await fetch("http://localhost/api/v1/alumnos/1", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${MOCK_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contacto),
    });
    const cuerpoCompleto = cuerpoActualizacion();
    cuerpoCompleto.usuario.nombre = "Nombre no permitido";
    const actualizacionPersonal = await fetch("http://localhost/api/v1/alumnos/1", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${MOCK_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpoCompleto),
    });

    expect(actualizacionContacto.status).toBe(200);
    expect(actualizacionPersonal.status).toBe(403);
  });

  it("conserva el historial de cobros cuando la propietaria cambia el plan", async () => {
    const historicoAnterior = structuredClone(db.alumnos[0].historial_cobros);
    const cambios = cuerpoActualizacion();
    cambios.id_plan = 2;
    cambios.id_horarios = [3, 4];
    const respuesta = await fetch("http://localhost/api/v1/alumnos/1", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${MOCK_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cambios),
    });
    const alumnoActualizado = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(alumnoActualizado.inscripcion.plan.id_plan).toBe(2);
    expect(alumnoActualizado.historial_cobros).toEqual(historicoAnterior);
  });

  it("desvincula al tutor cuando el alumno pasa a ser mayor de edad", async () => {
    const cambios = cuerpoActualizacion(2);
    cambios.usuario.fecha_nacimiento = "2007-08-22";
    cambios.tutor = null;
    const respuesta = await fetch("http://localhost/api/v1/alumnos/2", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${MOCK_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cambios),
    });
    const alumnoActualizado = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(alumnoActualizado.tutor).toBeNull();
    expect(alumnoActualizado.id_usuario_responsable).toBeNull();
  });
});
