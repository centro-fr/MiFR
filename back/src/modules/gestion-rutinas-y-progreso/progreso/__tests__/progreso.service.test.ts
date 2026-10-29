import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegistrarProgresoInput } from "../progreso.schemas.js";
import type { ProgresoRepository } from "../progreso.repository.js";
import { ProgresoService } from "../progreso.service.js";
import type { RegistroDeProgreso } from "../progreso.types.js";

const repositorio = {
  crear: vi.fn(),
  listarDeAlumno: vi.fn(),
  buscarPorId: vi.fn(),
  actualizar: vi.fn(),
  darDeBaja: vi.fn(),
};
const aCargo = { profesoraTieneAlumno: vi.fn() };
const alumnos = { buscarPorId: vi.fn(), buscarPorIdUsuario: vi.fn(), buscarPorIdUsuarioResponsable: vi.fn() };
const profesoras = { buscarPorId: vi.fn(), buscarPorUsuario: vi.fn() };

const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

// El alumno 5 es el usuario 100 y su tutor es el usuario 200.
const ALUMNO = { id_usuario: 100, id_usuario_responsable: 200 };
const PROPIETARIA = { idUsuario: 1, esPropietaria: true };
const PROFESORA = { idUsuario: 2, esPropietaria: false };
const EL_ALUMNO = { idUsuario: 100, esPropietaria: false };
const EL_TUTOR = { idUsuario: 200, esPropietaria: false };
const AJENO = { idUsuario: 300, esPropietaria: false };

const INPUT: RegistrarProgresoInput = {
  id_alumno: 5,
  observaciones: null,
  medidas: [
    { codigo: "PESO", valor: 60 },
    { codigo: "CINTURA", valor: 70.5 },
  ],
};

const REGISTRO: RegistroDeProgreso = {
  id_registro: 1,
  id_alumno: 5,
  id_profesora: 10,
  fecha: fecha("2026-10-26"),
  observaciones: null,
  fecha_modificacion: null,
  id_usuario_modifica: null,
  medidas: [
    { codigo: "PESO", unidad: "kg", valor: 60 },
    { codigo: "CINTURA", unidad: "cm", valor: 70.5 },
  ],
};

async function estado(promesa: Promise<unknown>): Promise<number | undefined> {
  return promesa.then(
    () => undefined,
    (error: { statusCode?: number; status?: number }) => error.statusCode ?? error.status,
  );
}

describe("ProgresoService", () => {
  let service: ProgresoService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
    alumnos.buscarPorId.mockResolvedValue(ALUMNO);
    alumnos.buscarPorIdUsuario.mockResolvedValue(null);
    alumnos.buscarPorIdUsuarioResponsable.mockResolvedValue(null);
    profesoras.buscarPorUsuario.mockResolvedValue(null);
    profesoras.buscarPorId.mockResolvedValue({ id_profesora: 10 });
    aCargo.profesoraTieneAlumno.mockResolvedValue(false);
    repositorio.crear.mockResolvedValue(REGISTRO);
    service = new ProgresoService(repositorio as unknown as ProgresoRepository, aCargo, alumnos, profesoras);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("registrar", () => {
    beforeEach(() => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
      aCargo.profesoraTieneAlumno.mockResolvedValue(true);
    });

    it("la profesora a cargo registra las medidas con la unidad del catálogo y la fecha de hoy", async () => {
      expect(await service.registrar(INPUT, PROFESORA)).toEqual(REGISTRO);

      expect(repositorio.crear).toHaveBeenCalledWith({
        id_alumno: 5,
        id_profesora: 10,
        fecha: fecha("2026-10-26"),
        observaciones: null,
        medidas: [
          { codigo: "PESO", unidad: "kg", valor: 60 },
          { codigo: "CINTURA", unidad: "cm", valor: 70.5 },
        ],
      });
    });

    it("usa la fecha indicada si no es futura", async () => {
      await service.registrar({ ...INPUT, fecha: fecha("2026-10-20") }, PROFESORA);

      expect(repositorio.crear).toHaveBeenCalledWith(expect.objectContaining({ fecha: fecha("2026-10-20") }));
    });

    it("acepta la fecha de hoy", async () => {
      await service.registrar({ ...INPUT, fecha: fecha("2026-10-26") }, PROFESORA);

      expect(repositorio.crear).toHaveBeenCalled();
    });

    it("responde 400 si la fecha es futura", async () => {
      expect(await estado(service.registrar({ ...INPUT, fecha: fecha("2026-10-27") }, PROFESORA))).toBe(400);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it("una profesora no puede cargar a nombre de otra", async () => {
      await service.registrar({ ...INPUT, id_profesora: 99 }, PROFESORA);

      expect(repositorio.crear).toHaveBeenCalledWith(expect.objectContaining({ id_profesora: 10 }));
    });

    it("responde 403 si la profesora no tiene al alumno a cargo", async () => {
      aCargo.profesoraTieneAlumno.mockResolvedValue(false);

      expect(await estado(service.registrar(INPUT, PROFESORA))).toBe(403);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it.each([
      ["el propio alumno", EL_ALUMNO],
      ["el tutor", EL_TUTOR],
      ["un ajeno", AJENO],
    ])("responde 403 si registra %s", async (_nombre, solicitante) => {
      profesoras.buscarPorUsuario.mockResolvedValue(null);

      expect(await estado(service.registrar(INPUT, solicitante))).toBe(403);
      expect(repositorio.crear).not.toHaveBeenCalled();
    });

    it("la propietaria registra a nombre de la profesora que indica", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue(null);

      await service.registrar({ ...INPUT, id_profesora: 10 }, PROPIETARIA);

      expect(repositorio.crear).toHaveBeenCalledWith(expect.objectContaining({ id_profesora: 10 }));
    });

    it("responde 400 si la propietaria no es profesora y no indica cuál", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue(null);

      expect(await estado(service.registrar(INPUT, PROPIETARIA))).toBe(400);
    });

    it("responde 404 si la propietaria registra a un alumno que no existe", async () => {
      alumnos.buscarPorId.mockResolvedValue(null);

      expect(await estado(service.registrar({ ...INPUT, id_profesora: 10 }, PROPIETARIA))).toBe(404);
    });
  });

  describe("listarDeAlumno", () => {
    const conObservaciones = { ...REGISTRO, observaciones: "Medida tomada después de entrenar" };

    it("la propietaria consulta con las observaciones", async () => {
      repositorio.listarDeAlumno.mockResolvedValue([conObservaciones]);

      expect(await service.listarDeAlumno(5, PROPIETARIA)).toEqual([conObservaciones]);
      expect(repositorio.listarDeAlumno).toHaveBeenCalledWith(5);
    });

    it.each([
      ["el propio alumno", EL_ALUMNO],
      ["el tutor del menor", EL_TUTOR],
    ])("%s consulta sin las observaciones", async (_quien, solicitante) => {
      repositorio.listarDeAlumno.mockResolvedValue([conObservaciones]);

      expect(await service.listarDeAlumno(5, solicitante)).toEqual([
        { ...conObservaciones, observaciones: null },
      ]);
    });

    it("la profesora a cargo del alumno consulta con las observaciones", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
      aCargo.profesoraTieneAlumno.mockResolvedValue(true);
      repositorio.listarDeAlumno.mockResolvedValue([conObservaciones]);

      expect(await service.listarDeAlumno(5, PROFESORA)).toEqual([conObservaciones]);
    });

    it("responde 403 a la profesora que no lo tiene a cargo", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });

      expect(await estado(service.listarDeAlumno(5, PROFESORA))).toBe(403);
      expect(repositorio.listarDeAlumno).not.toHaveBeenCalled();
    });

    it("responde 403 a un alumno o tutor ajeno (RNF-02)", async () => {
      expect(await estado(service.listarDeAlumno(5, AJENO))).toBe(403);
    });

    it("responde 404 a la propietaria si el alumno no existe", async () => {
      alumnos.buscarPorId.mockResolvedValue(null);

      expect(await estado(service.listarDeAlumno(5, PROPIETARIA))).toBe(404);
    });

    it("responde 403, no 404, a quien no puede ver a un alumno inexistente", async () => {
      alumnos.buscarPorId.mockResolvedValue(null);

      expect(await estado(service.listarDeAlumno(5, AJENO))).toBe(403);
    });

    it("devuelve una lista vacía si el alumno todavía no tiene mediciones", async () => {
      repositorio.listarDeAlumno.mockResolvedValue([]);

      expect(await service.listarDeAlumno(5, EL_ALUMNO)).toEqual([]);
    });
  });

  describe.each([
    [
      "actualizar",
      (s: ProgresoService, solicitante: typeof PROPIETARIA) =>
        s.actualizar(1, { observaciones: "ok" }, solicitante),
    ],
    ["eliminar", (s: ProgresoService, solicitante: typeof PROPIETARIA) => s.eliminar(1, solicitante)],
  ])("%s: quién puede tocar un registro", (_nombre, operar) => {
    beforeEach(() => {
      repositorio.buscarPorId.mockResolvedValue(REGISTRO);
      repositorio.actualizar.mockResolvedValue(REGISTRO);
    });

    it("la profesora a cargo del alumno puede", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
      aCargo.profesoraTieneAlumno.mockResolvedValue(true);

      await expect(operar(service, PROFESORA)).resolves.not.toThrow();
      expect(aCargo.profesoraTieneAlumno).toHaveBeenCalledWith(10, 5);
    });

    it("la propietaria puede con cualquier alumno", async () => {
      await expect(operar(service, PROPIETARIA)).resolves.not.toThrow();
    });

    it("responde 403 a una profesora que no tiene al alumno a cargo", async () => {
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });

      expect(await estado(operar(service, PROFESORA))).toBe(403);
      expect(repositorio.actualizar).not.toHaveBeenCalled();
      expect(repositorio.darDeBaja).not.toHaveBeenCalled();
    });

    it.each([
      ["el propio alumno", EL_ALUMNO],
      ["el tutor", EL_TUTOR],
      ["un ajeno", AJENO],
    ])("responde 403 a %s", async (_quien, solicitante) => {
      expect(await estado(operar(service, solicitante))).toBe(403);
      expect(repositorio.actualizar).not.toHaveBeenCalled();
      expect(repositorio.darDeBaja).not.toHaveBeenCalled();
    });

    it("responde 404 a la propietaria si el registro no existe o ya está dado de baja", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      expect(await estado(operar(service, PROPIETARIA))).toBe(404);
    });

    it("responde 403, no 404, a quien no es propietaria si el registro no existe", async () => {
      repositorio.buscarPorId.mockResolvedValue(null);
      profesoras.buscarPorUsuario.mockResolvedValue({ id_profesora: 10 });
      aCargo.profesoraTieneAlumno.mockResolvedValue(true);

      expect(await estado(operar(service, PROFESORA))).toBe(403);
    });
  });

  describe("actualizar", () => {
    beforeEach(() => {
      repositorio.buscarPorId.mockResolvedValue(REGISTRO);
      repositorio.actualizar.mockResolvedValue(REGISTRO);
    });

    it("corrige las medidas con la unidad del catálogo y deja quién lo hizo", async () => {
      expect(
        await service.actualizar(1, { medidas: [{ codigo: "PESO", valor: 62.4 }] }, PROPIETARIA),
      ).toEqual(REGISTRO);

      expect(repositorio.actualizar).toHaveBeenCalledWith(
        1,
        {
          fecha: undefined,
          observaciones: undefined,
          medidas: [{ codigo: "PESO", unidad: "kg", valor: 62.4 }],
        },
        PROPIETARIA.idUsuario,
      );
    });

    it("pasa solo lo que se corrige y deja observaciones en null para borrarla", async () => {
      await service.actualizar(1, { observaciones: null }, PROPIETARIA);

      expect(repositorio.actualizar).toHaveBeenCalledWith(
        1,
        { fecha: undefined, observaciones: null, medidas: undefined },
        PROPIETARIA.idUsuario,
      );
    });

    it("acepta una fecha de hoy y rechaza una futura con 400", async () => {
      await service.actualizar(1, { fecha: fecha("2026-10-26") }, PROPIETARIA);

      expect(await estado(service.actualizar(1, { fecha: fecha("2026-10-27") }, PROPIETARIA))).toBe(400);
      expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
    });
  });

  describe("eliminar", () => {
    it("da de baja el registro dejando quién lo hizo", async () => {
      repositorio.buscarPorId.mockResolvedValue(REGISTRO);

      await service.eliminar(1, PROPIETARIA);

      expect(repositorio.darDeBaja).toHaveBeenCalledWith(1, PROPIETARIA.idUsuario);
    });
  });

  describe("listarPropio", () => {
    it("resuelve el alumno de quien pide y le oculta las observaciones", async () => {
      alumnos.buscarPorIdUsuario.mockResolvedValue({ id_alumno: 5 });
      repositorio.listarDeAlumno.mockResolvedValue([{ ...REGISTRO, observaciones: "Privada" }]);

      expect(await service.listarPropio(EL_ALUMNO)).toEqual([REGISTRO]);
      expect(repositorio.listarDeAlumno).toHaveBeenCalledWith(5);
    });

    it("responde 404 si quien pide no es alumno ni tutor", async () => {
      expect(await estado(service.listarPropio(AJENO))).toBe(404);
    });
  });
});
