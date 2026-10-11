import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { apiClient } from "@/api/client";
import { esMontoDistinto, listarPreInscripcionesPendientes } from "@/features/alumnos/api/alta-definitiva-api";

vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

function persona(id_usuario: number, nombre: string, apellido: string, cambios: object = {}) {
  return {
    id_usuario,
    nombre,
    apellido,
    dni: null,
    email: null,
    telefono: null,
    fecha_nacimiento: "1984-06-21T00:00:00.000Z",
    direccion: null,
    estado: "INACTIVO",
    ...cambios,
  };
}

const ALUMNO_MENOR = {
  id_alumno: 2,
  id_usuario: 102,
  id_usuario_responsable: 103,
  cont_emerg_nombre: null,
  cont_emerg_telefono: null,
  apto_medico: false,
  fecha_apto_medico: null,
  observaciones: null,
  estado: "INACTIVO",
  fecha_alta: "2026-01-01T00:00:00.000Z",
  fecha_baja: null,
  usuario: persona(102, "Mateo", "Romero", { dni: "52111222", fecha_nacimiento: "2015-11-03T00:00:00.000Z" }),
  responsable: persona(103, "Paula", "Romero", { telefono: "351 555-0101" }),
};

// Inscripcion del back: el precio es NUMERIC y llega como texto.
const INSCRIPCION = {
  id_inscripcion: 2,
  id_alumno: 2,
  estado: "PREINSCRIPTA",
  fecha_alta: "2026-10-08T15:00:00.000Z",
  plan: { id_plan: 3, nombre: "Personalizado 2 días" },
  plan_precio: { precio: "45000" },
  profesora: { usuario: { nombre: "Carla", apellido: "Ruiz" } },
  horarios: [
    { horario: { dia_semana: 2, hora_inicio: "1970-01-01T09:00:00.000Z", hora_fin: "1970-01-01T10:00:00.000Z", actividad: { nombre: "Pilates Reformer" } } },
  ],
};

function simularRespuestas(inscripciones: unknown[], alumnos: unknown[]) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
    url === "/inscripciones" ? { data: inscripciones } : { data: { datos: alumnos, total: alumnos.length } },
  );
}

describe("listarPreInscripcionesPendientes", () => {
  beforeEach(() => vi.mocked(apiClient.get).mockReset());

  it("pide las inscripciones PREINSCRIPTA y los alumnos INACTIVO, sin una consulta por alumno", async () => {
    simularRespuestas([], []);

    await listarPreInscripcionesPendientes();

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(apiClient.get).toHaveBeenCalledWith("/inscripciones", { params: { estado: "PREINSCRIPTA", limit: "100" } });
    expect(apiClient.get).toHaveBeenCalledWith("/alumnos", { params: { estado: "INACTIVO", limit: "100" } });
  });

  it("une cada inscripción con los datos de su alumno y su tutor", async () => {
    simularRespuestas([INSCRIPCION], [ALUMNO_MENOR]);

    const [pendiente] = await listarPreInscripcionesPendientes();

    expect(pendiente).toMatchObject({
      idInscripcion: "2",
      idAlumno: "2",
      nombre: "Mateo",
      dni: "52111222",
      fechaNacimiento: "2015-11-03",
      tutor: { nombre: "Paula", apellido: "Romero", telefono: "351 555-0101" },
      nombrePlan: "Personalizado 2 días",
      precio: 45000,
      profesora: "Carla Ruiz",
      horarios: [{ dia: "MARTES", horaInicio: "09:00", horaFin: "10:00", actividad: "Pilates Reformer" }],
    });
  });

  // Se activó entre una consulta y la otra: ya no está pendiente.
  it("omite la inscripción si su alumno ya no figura como INACTIVO", async () => {
    simularRespuestas([INSCRIPCION], []);

    await expect(listarPreInscripcionesPendientes()).resolves.toEqual([]);
  });
});

describe("esMontoDistinto", () => {
  function error409(code: string) {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError("error", "ERR", config, null, {
      status: 409,
      statusText: "",
      data: { error: { code, message: "" } },
      headers: {},
      config,
    });
  }

  it("reconoce el 409 MONTO_DISTINTO y no otros conflictos", () => {
    expect(esMontoDistinto(error409("MONTO_DISTINTO"))).toBe(true);
    expect(esMontoDistinto(error409("CONFLICT"))).toBe(false);
    expect(esMontoDistinto(new Error("x"))).toBe(false);
  });
});
