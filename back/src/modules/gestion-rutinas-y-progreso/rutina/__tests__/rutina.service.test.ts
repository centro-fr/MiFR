import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrearRutinaInput } from "../rutina.schemas.js";
import type { RutinaRepository } from "../rutina.repository.js";
import { RutinaService } from "../rutina.service.js";
import type { Rutina } from "../rutina.types.js";

const repositorio = {
  listarDeAlumno: vi.fn(),
  buscarVigenteDeAlumno: vi.fn(),
  profesoraTieneAlumno: vi.fn(),
  crear: vi.fn(),
};
const alumnos = { buscarPorId: vi.fn() };
const profesoras = { buscarPorId: vi.fn(), buscarPorUsuario: vi.fn() };

const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

// El alumno 5 es el usuario 100 y su tutor es el usuario 200.
const ALUMNO = { id_usuario: 100, id_usuario_responsable: 200 };
const PROPIETARIA = { idUsuario: 1, esPropietaria: true };
const PROFESORA = { idUsuario: 2, esPropietaria: false };
const EL_ALUMNO = { idUsuario: 100, esPropietaria: false };
const EL_TUTOR = { idUsuario: 200, esPropietaria: false };
const AJENO = { idUsuario: 300, esPropietaria: false };

const INPUT: CrearRutinaInput = {
  id_alumno: 5,
  nombre: "Adaptación Fuerza - Mes 1",
  fecha_desde: fecha("2026-11-01"),
  fecha_hasta: null,
  contenido: {
    dias: [
      { nombre: "Día 1", ejercicios: [{ nombre: "Sentadilla", series: 3, repeticiones: "10", notas: null }] },
    ],
  },
  observaciones: null,
};

const RUTINA: Rutina = {
  id_rutina: 1,
  id_alumno: 5,
  id_profesora: 10,
  nombre: INPUT.nombre,
  fecha_desde: INPUT.fecha_desde,
  fecha_hasta: null,
  contenido: INPUT.contenido,
  observaciones: null,
  activa: true,
};

const CON_OBSERVACIONES: Rutina = { ...RUTINA, observaciones: "Cuidar la rodilla izquierda" };

async function estado(promesa: Promise<unknown>): Promise<number | undefined> {
  return promesa.then(
    () => undefined,
    (error: { statusCode?: number; status?: number }) => error.statusCode ?? error.status,
  );
}

describe("RutinaService", () => {
  let service: RutinaService;

  beforeEach(() => {
    vi.clearAllMocks();
    alumnos.buscarPorId.mockResolvedValue(ALUMNO);
    profesoras.buscarPorUsuario.mockResolvedValue(null);
    profesoras.buscarPorId.mockResolvedValue({ id_profesora: 10 });
    repositorio.profesoraTieneAlumno.mockResolvedValue(false);
    repositorio.crear.mockResolvedValue(RUTINA);
    repositorio.listarDeAlumno.mockResolvedValue([]);
    repositorio.buscarVigenteDeAlumno.mockResolvedValue(null);
    service = new RutinaService(repositorio as unknown as RutinaRepository, alumnos, profesoras);
  });

  describe("crear", () => {
    it("la profesora a cargo del alumno carga la rutina a su nombre", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
      repositorio.profesoraTieneAlumno.mockResolvedValue(true);

      expect(await service.crear(INPUT, PROFESORA)).toEqual(RUTINA);
      expect(repositorio.profesoraTieneAlumno).toHaveBeenCalledWith(10, 5);
      expect(repositorio.crear).toHaveBeenCalledWith(
        expect.objectContaining({ id_alumno: 5, id_profesora: 10 }),
      );
    });

    it("una profesora no puede cargar a nombre de otra", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
      repositorio.profesoraTieneAlumno.mockResolvedValue(true);

      await service.crear({ ...INPUT, id_profesora: 99 }, PROFESORA);

      expect(repositorio.crear).toHaveBeenCalledWith(expect.objectContaining({ id_profesora: 10 }));
    });

    it("responde 403 si la profesora no tiene al alumno a cargo", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });

      expect(await estado(service.crear(INPUT, PROFESORA))).toBe(403);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it("responde 403 si quien pide no tiene perfil de profesora", async () => {
      expect(await estado(service.crear(INPUT, PROFESORA))).toBe(403);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it.each([
      ["el propio alumno", EL_ALUMNO],
      ["el tutor", EL_TUTOR],
    ])("%s no puede cargar rutinas", async (_nombre, solicitante) => {
      expect(await estado(service.crear(INPUT, solicitante))).toBe(403);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it("a una profesora un alumno inexistente se le responde igual que uno ajeno (403)", async () => {
      alumnos.buscarPorId.mockResolvedValue(null);
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
      repositorio.profesoraTieneAlumno.mockResolvedValue(true);

      expect(await estado(service.crear(INPUT, PROFESORA))).toBe(403);
    });

    it("la propietaria carga a nombre de la profesora que indica", async () => {
      await service.crear({ ...INPUT, id_profesora: 10 }, PROPIETARIA);

      expect(profesoras.buscarPorId).toHaveBeenCalledWith(10);
      expect(repositorio.crear).toHaveBeenCalledWith(expect.objectContaining({ id_profesora: 10 }));
    });

    it("la propietaria que también es profesora carga a su nombre si no indica otra", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 11 });

      await service.crear(INPUT, PROPIETARIA);

      expect(repositorio.crear).toHaveBeenCalledWith(expect.objectContaining({ id_profesora: 11 }));
    });

    it("responde 400 si la propietaria indica una profesora que no existe", async () => {
      profesoras.buscarPorId.mockResolvedValue(null);

      expect(await estado(service.crear({ ...INPUT, id_profesora: 99 }, PROPIETARIA))).toBe(400);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it("responde 400 si la propietaria no es profesora y no indica cuál", async () => {
      expect(await estado(service.crear(INPUT, PROPIETARIA))).toBe(400);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it("responde 404 si la propietaria carga a un alumno que no existe", async () => {
      alumnos.buscarPorId.mockResolvedValue(null);

      expect(await estado(service.crear({ ...INPUT, id_profesora: 10 }, PROPIETARIA))).toBe(404);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });
  });

  describe.each([
    [
      "listarDeAlumno",
      (s: RutinaService, solicitante: typeof PROPIETARIA) => s.listarDeAlumno(5, solicitante),
    ],
    [
      "obtenerVigente",
      (s: RutinaService, solicitante: typeof PROPIETARIA) => s.obtenerVigente(5, solicitante),
    ],
  ])("%s", (_nombre, consultar) => {
    it.each([
      ["la propietaria", PROPIETARIA],
      ["el propio alumno", EL_ALUMNO],
      ["el tutor del menor", EL_TUTOR],
    ])("%s puede consultar", async (_quien, solicitante) => {
      await expect(consultar(service, solicitante)).resolves.not.toThrow();
    });

    it("la profesora a cargo del alumno puede consultar", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
      repositorio.profesoraTieneAlumno.mockResolvedValue(true);

      await expect(consultar(service, PROFESORA)).resolves.not.toThrow();
    });

    it("responde 403 a la profesora que no lo tiene a cargo", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });

      expect(await estado(consultar(service, PROFESORA))).toBe(403);
    });

    it("responde 403 a un alumno o tutor ajeno (RNF-02)", async () => {
      expect(await estado(consultar(service, AJENO))).toBe(403);
    });

    it("responde 404 a la propietaria si el alumno no existe", async () => {
      alumnos.buscarPorId.mockResolvedValue(null);

      expect(await estado(consultar(service, PROPIETARIA))).toBe(404);
    });

    it("responde 403, no 404, a quien no puede ver a un alumno inexistente", async () => {
      alumnos.buscarPorId.mockResolvedValue(null);

      expect(await estado(consultar(service, AJENO))).toBe(403);
    });
  });

  it("listarDeAlumno devuelve el historial con las observaciones a la propietaria", async () => {
    repositorio.listarDeAlumno.mockResolvedValue([CON_OBSERVACIONES]);

    expect(await service.listarDeAlumno(5, PROPIETARIA)).toEqual([CON_OBSERVACIONES]);
    expect(repositorio.listarDeAlumno).toHaveBeenCalledWith(5);
  });

  it("listarDeAlumno le oculta las observaciones al alumno", async () => {
    repositorio.listarDeAlumno.mockResolvedValue([CON_OBSERVACIONES]);

    expect(await service.listarDeAlumno(5, EL_ALUMNO)).toEqual([
      { ...CON_OBSERVACIONES, observaciones: null },
    ]);
  });

  it("obtenerVigente le muestra las observaciones a la profesora a cargo", async () => {
    profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
    repositorio.profesoraTieneAlumno.mockResolvedValue(true);
    repositorio.buscarVigenteDeAlumno.mockResolvedValue(CON_OBSERVACIONES);

    expect(await service.obtenerVigente(5, PROFESORA)).toEqual(CON_OBSERVACIONES);
  });

  it("obtenerVigente le oculta las observaciones al tutor", async () => {
    repositorio.buscarVigenteDeAlumno.mockResolvedValue(CON_OBSERVACIONES);

    expect(await service.obtenerVigente(5, EL_TUTOR)).toEqual({ ...CON_OBSERVACIONES, observaciones: null });
  });

  it("la profesora a cargo que además es la tutora ve las observaciones", async () => {
    profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
    repositorio.profesoraTieneAlumno.mockResolvedValue(true);
    repositorio.buscarVigenteDeAlumno.mockResolvedValue(CON_OBSERVACIONES);

    expect(await service.obtenerVigente(5, EL_TUTOR)).toEqual(CON_OBSERVACIONES);
  });

  it("obtenerVigente devuelve null si el alumno todavía no tiene rutina", async () => {
    repositorio.buscarVigenteDeAlumno.mockResolvedValue(null);

    expect(await service.obtenerVigente(5, EL_ALUMNO)).toBeNull();
  });
});
