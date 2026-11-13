import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/client";
import { aAlumnoDetalle, darDeBajaAlumno, listarAlumnosRecientesPrimero, obtenerAlumno, type FiltrosDelListado } from "../alumnos-api";
import { fichaAlumnoApiSchema, type FichaAlumnoApi } from "../../schemas/alumno";

vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

function datosPersonales(cambios: Partial<FichaAlumnoApi["usuario"]> = {}): FichaAlumnoApi["usuario"] {
  return {
    id_usuario: 102,
    nombre: "Mateo",
    apellido: "Romero",
    dni: "52111222",
    email: null,
    telefono: null,
    fecha_nacimiento: "2015-11-03T00:00:00.000Z",
    direccion: null,
    estado: "INACTIVO",
    ...cambios,
  };
}

// Respuesta de GET /alumnos/:id con la forma de FichaAlumno del back (alumno.openapi.ts).
function respuestaApi(cambios: Partial<FichaAlumnoApi> = {}) {
  return {
    id_alumno: 2,
    id_usuario: 102,
    id_usuario_responsable: 103,
    cont_emerg_nombre: null,
    cont_emerg_telefono: null,
    apto_medico: true,
    fecha_apto_medico: "2026-03-10T00:00:00.000Z",
    observaciones: null,
    estado: "INACTIVO" as const,
    fecha_alta: "2026-08-02T14:30:00.000Z",
    fecha_baja: null,
    usuario: datosPersonales(),
    responsable: datosPersonales({ id_usuario: 103, nombre: "Paula", dni: "31222333", email: "paula.romero@example.com" }),
    inscripciones: [],
    ...cambios,
  };
}

function parsear(respuesta: unknown) {
  return aAlumnoDetalle(fichaAlumnoApiSchema.parse(respuesta));
}

describe("aAlumnoDetalle", () => {
  it("deja las columnas DATE como fecha calendario AAAA-MM-DD", () => {
    const ficha = parsear(respuestaApi());

    expect(ficha.usuario.fecha_nacimiento).toBe("2015-11-03");
    expect(ficha.fecha_apto_medico).toBe("2026-03-10");
  });

  it("aplana los datos del usuario y del tutor a cargo", () => {
    const ficha = parsear(respuestaApi());

    expect(ficha).toMatchObject({ id_alumno: 2, usuario: { nombre: "Mateo", apellido: "Romero", dni: "52111222" } });
    expect(ficha.tutor).toEqual({
      nombre: "Paula",
      apellido: "Romero",
      dni: "31222333",
      telefono: null,
      email: "paula.romero@example.com",
    });
  });

  it("respeta los NULL del DER sin inventar valores", () => {
    const ficha = parsear(respuestaApi({ responsable: null, fecha_apto_medico: null }));

    expect(ficha.usuario.email).toBeNull();
    expect(ficha.tutor).toBeNull();
    expect(ficha.fecha_apto_medico).toBeNull();
  });
});

describe("fichaAlumnoApiSchema", () => {
  it("rechaza un estado que no existe en el enum del DER", () => {
    expect(fichaAlumnoApiSchema.safeParse({ ...respuestaApi(), estado: "PENDIENTE" }).success).toBe(false);
  });
});

describe("llamadas a la API", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("pide la ficha a /alumnos/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: respuestaApi() });

    const ficha = await obtenerAlumno(2);

    expect(apiClient.get).toHaveBeenCalledWith("/alumnos/2");
    expect(ficha.usuario.nombre).toBe("Mateo");
  });

  // darDeBajaAlumnoSchema del back espera el motivo en `motivo_baja`.
  it("manda la baja con el motivo en motivo_baja", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { mensaje: "Alumno dado de baja" } });

    await darDeBajaAlumno(2, "MUDANZA");

    expect(apiClient.post).toHaveBeenCalledWith("/alumnos/2/baja", { motivo_baja: "MUDANZA" });
  });
});

const FILTROS: FiltrosDelListado = { busqueda: "", estado: "TODOS", id_plan: "", id_profesora: "", id_actividad: "", incluir_bajas: false };

describe("listarAlumnosRecientesPrimero", () => {
  const RESUMEN = { id_inscripcion: 3, estado: "ACTIVA", id_plan: 2, nombre_plan: "Plan Intermedio", id_profesora: 1, nombre_profesora: "Lucía Gómez" };
  const VENCIDA = { estado: "VENCIDA", fecha_vencimiento: "2026-10-01T00:00:00.000Z", dias_restantes: -3, puede_asistir: false, tiene_pago_pendiente: false };

  function filaDelListado(cambios: object) {
    // La fila del listado no trae las inscripciones de la ficha: sin `cambios`, es la de un back anterior.
    return { ...respuestaApi({ estado: "ACTIVO" }), inscripciones: undefined, inscripcion: RESUMEN, situacion_cuota: VENCIDA, ...cambios };
  }

  beforeEach(() => vi.mocked(apiClient.get).mockReset());

  it("trae todas las inscripciones vigentes del alumno, cada una con su cuota", async () => {
    const segunda = { ...RESUMEN, id_inscripcion: 34, id_plan: 1, nombre_plan: "Plan Básico", situacion_cuota: null };
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { datos: [filaDelListado({ inscripciones: [{ ...RESUMEN, situacion_cuota: VENCIDA }, segunda] })], total: 1, limit: 100, offset: 0 },
    });

    const [alumno] = await listarAlumnosRecientesPrimero(FILTROS);

    expect(alumno.id_inscripcion).toBe(3);
    expect(alumno.inscripciones).toEqual([
      expect.objectContaining({ id_inscripcion: 3, plan: "Plan Intermedio", situacion_cuota: expect.objectContaining({ fecha_vencimiento: "2026-10-01" }) }),
      expect.objectContaining({ id_inscripcion: 34, plan: "Plan Básico", situacion_cuota: null }),
    ]);
  });

  it("con un back que no manda las inscripciones, usa la más reciente", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { datos: [filaDelListado({})], total: 1, limit: 100, offset: 0 } });

    const [alumno] = await listarAlumnosRecientesPrimero(FILTROS);

    expect(alumno.inscripciones).toEqual([expect.objectContaining({ id_inscripcion: 3, plan: "Plan Intermedio", profesora: "Lucía Gómez" })]);
  });
});
