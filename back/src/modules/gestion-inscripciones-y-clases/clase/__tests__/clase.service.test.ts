import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error.js";
import type { IInfoProfesores } from "../../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { IInfoHorarios } from "../../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.types.js";
import type { ClaseRepository } from "../clase.repository.js";
import { ClaseService } from "../clase.service.js";

const HOY = new Date("2026-10-12T00:00:00.000Z");
const PROPIETARIA: Solicitante = { idUsuario: 1, esPropietaria: true };
const PROFESORA: Solicitante = { idUsuario: 2, esPropietaria: false };
const profesora = { id_profesora: 8, id_usuario: 2 };
const claseDeHoy = { id_clase: 20, id_prof_dictante: 8, fecha_clase: HOY };
// El 12/10/2026 es lunes.
const horarioDeLosLunes = {
  id_horario: 4,
  id_profesora: 8,
  dia_semana: 1,
  fecha_alta: new Date("2026-09-01T00:00:00Z"),
  fecha_baja: null,
};

function crearMocks() {
  return {
    repositorio: {
      crearDelDia: vi.fn(),
      listarPorFecha: vi.fn().mockResolvedValue([claseDeHoy]),
      buscarPorId: vi.fn().mockResolvedValue(claseDeHoy),
      bloquear: vi.fn(),
      cerrar: vi.fn(),
      cancelar: vi.fn(),
      listarAbiertasHasta: vi.fn(),
      buscarPorHorarioYFecha: vi.fn().mockResolvedValue(claseDeHoy),
      cambiarDictante: vi.fn(),
      listarSuplidasEnPeriodo: vi.fn(),
    },
    horarios: {
      listarActivosDelDia: vi.fn().mockResolvedValue([
        { id_horario: 4, id_profesora: 8 },
        { id_horario: 5, id_profesora: 9 },
      ]),
      buscarPorIds: vi.fn().mockResolvedValue([horarioDeLosLunes]),
    },
    profesores: { buscarPorUsuario: vi.fn().mockResolvedValue(profesora) },
  };
}

describe("ClaseService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: ClaseService;

  beforeEach(() => {
    vi.useFakeTimers();
    // 21:30 de Argentina: en UTC ya es el 13, pero las clases son las del 12.
    vi.setSystemTime(new Date("2026-10-13T00:30:00.000Z"));
    mocks = crearMocks();
    servicio = new ClaseService(
      mocks.repositorio as unknown as ClaseRepository,
      mocks.horarios as unknown as IInfoHorarios,
      mocks.profesores as unknown as IInfoProfesores,
    );
  });

  afterEach(() => vi.useRealTimers());

  it("materializarDelDia crea para la propietaria las clases de todos los horarios del día de Argentina", async () => {
    await servicio.materializarDelDia(PROPIETARIA);

    expect(mocks.horarios.listarActivosDelDia).toHaveBeenCalledWith(HOY);
    expect(mocks.repositorio.crearDelDia).toHaveBeenCalledWith(
      [
        { id_horario: 4, id_profesora: 8 },
        { id_horario: 5, id_profesora: 9 },
      ],
      HOY,
    );
    expect(mocks.profesores.buscarPorUsuario).not.toHaveBeenCalled();
  });

  it("materializarDelDia crea para una profesora solo las clases de sus horarios", async () => {
    await servicio.materializarDelDia(PROFESORA);

    expect(mocks.profesores.buscarPorUsuario).toHaveBeenCalledWith(2);
    expect(mocks.repositorio.crearDelDia).toHaveBeenCalledWith([{ id_horario: 4, id_profesora: 8 }], HOY);
  });

  it("materializarDelDia no crea nada para quien no es una profesora activa", async () => {
    mocks.profesores.buscarPorUsuario.mockResolvedValue(null);

    await servicio.materializarDelDia(PROFESORA);

    expect(mocks.horarios.listarActivosDelDia).not.toHaveBeenCalled();
    expect(mocks.repositorio.crearDelDia).not.toHaveBeenCalled();
  });

  it("listarDelDia lista todas para la propietaria y solo las propias para la profesora", async () => {
    await servicio.listarDelDia(PROPIETARIA);
    await servicio.listarDelDia(PROFESORA);

    expect(mocks.repositorio.listarPorFecha).toHaveBeenNthCalledWith(1, HOY, undefined);
    expect(mocks.repositorio.listarPorFecha).toHaveBeenNthCalledWith(2, HOY, 8);
  });

  it("listarDelDia devuelve una lista vacía a quien no es una profesora activa", async () => {
    mocks.profesores.buscarPorUsuario.mockResolvedValue(null);

    await expect(servicio.listarDelDia(PROFESORA)).resolves.toEqual([]);
    expect(mocks.repositorio.listarPorFecha).not.toHaveBeenCalled();
  });

  it("obtenerPara devuelve a la propietaria una clase de cualquier día (corrección)", async () => {
    const pasada = { ...claseDeHoy, fecha_clase: new Date("2026-10-01T00:00:00Z") };
    mocks.repositorio.buscarPorId.mockResolvedValue(pasada);

    await expect(servicio.obtenerPara(20, PROPIETARIA)).resolves.toBe(pasada);
    expect(mocks.profesores.buscarPorUsuario).not.toHaveBeenCalled();
  });

  it("obtenerPara devuelve a la profesora dictante su clase de hoy", async () => {
    await expect(servicio.obtenerPara(20, PROFESORA)).resolves.toBe(claseDeHoy);
  });

  it("obtenerPara lanza NotFoundError si la clase no existe", async () => {
    mocks.repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.obtenerPara(99, PROPIETARIA)).rejects.toBeInstanceOf(NotFoundError);
  });

  it.each([
    ["de otra profesora", { ...claseDeHoy, id_prof_dictante: 9 }, profesora],
    ["de otro día", { ...claseDeHoy, fecha_clase: new Date("2026-10-11T00:00:00Z") }, profesora],
    ["a quien no es profesora", claseDeHoy, null],
  ])("obtenerPara responde 404, como si no existiera, a una clase %s", async (_caso, clase, quien) => {
    mocks.repositorio.buscarPorId.mockResolvedValue(clase);
    mocks.profesores.buscarPorUsuario.mockResolvedValue(quien);

    await expect(servicio.obtenerPara(20, PROFESORA)).rejects.toThrow(
      new NotFoundError("Clase no encontrada"),
    );
  });

  it("bloquearParaMarcar deja marcar una clase PROGRAMADA a cualquiera", async () => {
    mocks.repositorio.bloquear.mockResolvedValue("PROGRAMADA");

    await expect(servicio.bloquearParaMarcar(20, PROFESORA)).resolves.toBeUndefined();
    expect(mocks.repositorio.bloquear).toHaveBeenCalledWith(20);
  });

  it("bloquearParaMarcar deja corregir una clase DICTADA solo a la propietaria", async () => {
    mocks.repositorio.bloquear.mockResolvedValue("DICTADA");

    await expect(servicio.bloquearParaMarcar(20, PROPIETARIA)).resolves.toBeUndefined();
    await expect(servicio.bloquearParaMarcar(20, PROFESORA)).rejects.toThrow(
      new ConflictError("La asistencia de la clase está cerrada: solo la propietaria la corrige"),
    );
  });

  it("bloquearParaMarcar rechaza una clase CANCELADA, también a la propietaria", async () => {
    mocks.repositorio.bloquear.mockResolvedValue("CANCELADA");

    await expect(servicio.bloquearParaMarcar(20, PROPIETARIA)).rejects.toThrow(
      new ConflictError("La clase está cancelada"),
    );
  });

  it("bloquearParaMarcar lanza NotFoundError si la clase no existe", async () => {
    mocks.repositorio.bloquear.mockResolvedValue(null);

    await expect(servicio.bloquearParaMarcar(20, PROPIETARIA)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("materializarDelDia y listarDelDia usan la fecha que se les pasa (corrección de la propietaria)", async () => {
    const ayer = new Date("2026-10-11T00:00:00.000Z");

    await servicio.materializarDelDia(PROPIETARIA, ayer);
    await servicio.listarDelDia(PROPIETARIA, ayer);

    expect(mocks.horarios.listarActivosDelDia).toHaveBeenCalledWith(ayer);
    expect(mocks.repositorio.crearDelDia).toHaveBeenCalledWith(expect.any(Array), ayer);
    expect(mocks.repositorio.listarPorFecha).toHaveBeenCalledWith(ayer, undefined);
  });

  it.each(["PROGRAMADA", "CANCELADA"] as const)(
    "bloquearParaCancelar toma el bloqueo y devuelve el estado de una clase %s",
    async (estado) => {
      mocks.repositorio.bloquear.mockResolvedValue(estado);

      await expect(servicio.bloquearParaCancelar(20)).resolves.toBe(estado);
      expect(mocks.repositorio.bloquear).toHaveBeenCalledWith(20);
    },
  );

  it("bloquearParaCancelar rechaza una clase DICTADA y una que no existe", async () => {
    mocks.repositorio.bloquear.mockResolvedValueOnce("DICTADA").mockResolvedValueOnce(null);

    await expect(servicio.bloquearParaCancelar(20)).rejects.toBeInstanceOf(ConflictError);
    await expect(servicio.bloquearParaCancelar(20)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("cancelar se delega en el repositorio", async () => {
    await servicio.cancelar(20);

    expect(mocks.repositorio.cancelar).toHaveBeenCalledWith(20);
  });

  it("listarAbiertasHasta y cerrar se delegan en el repositorio", async () => {
    const fecha = new Date();
    mocks.repositorio.listarAbiertasHasta.mockResolvedValue(["abierta"]);
    mocks.repositorio.cerrar.mockResolvedValue("cerrada");

    await expect(servicio.listarAbiertasHasta(HOY)).resolves.toEqual(["abierta"]);
    await expect(servicio.cerrar(20, fecha)).resolves.toBe("cerrada");
    expect(mocks.repositorio.listarAbiertasHasta).toHaveBeenCalledWith(HOY);
    expect(mocks.repositorio.cerrar).toHaveBeenCalledWith(20, fecha);
  });

  it("materializar crea la clase del horario en esa fecha con la titular y la devuelve", async () => {
    await expect(servicio.materializar(4, HOY)).resolves.toBe(claseDeHoy);

    expect(mocks.horarios.buscarPorIds).toHaveBeenCalledWith([4]);
    expect(mocks.repositorio.crearDelDia).toHaveBeenCalledWith([horarioDeLosLunes], HOY);
    expect(mocks.repositorio.buscarPorHorarioYFecha).toHaveBeenCalledWith(4, HOY);
  });

  it("materializar acepta un sábado como día 6 y un horario dado de baja después de la fecha", async () => {
    const sabado = new Date("2026-10-17T00:00:00Z");
    mocks.horarios.buscarPorIds.mockResolvedValue([
      { ...horarioDeLosLunes, dia_semana: 6, fecha_baja: new Date("2026-10-18T00:00:00Z") },
    ]);

    await expect(servicio.materializar(4, sabado)).resolves.toBe(claseDeHoy);
  });

  it("materializar lanza NotFoundError si el horario no existe", async () => {
    mocks.horarios.buscarPorIds.mockResolvedValue([]);

    await expect(servicio.materializar(4, HOY)).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.repositorio.crearDelDia).not.toHaveBeenCalled();
  });

  it("materializar rechaza con 400 una fecha de otro día de la semana, también un domingo", async () => {
    await expect(servicio.materializar(4, new Date("2026-10-13T00:00:00Z"))).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(servicio.materializar(4, new Date("2026-10-11T00:00:00Z"))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mocks.repositorio.crearDelDia).not.toHaveBeenCalled();
  });

  it.each([
    ["antes del alta", { fecha_alta: new Date("2026-10-13T00:00:00Z") }],
    ["el día de la baja", { fecha_baja: HOY }],
    ["después de la baja", { fecha_baja: new Date("2026-10-05T00:00:00Z") }],
  ])("materializar rechaza un horario que no estaba vigente: %s", async (_caso, cambio) => {
    mocks.horarios.buscarPorIds.mockResolvedValue([{ ...horarioDeLosLunes, ...cambio }]);

    await expect(servicio.materializar(4, HOY)).rejects.toThrow("El horario no estaba vigente en esa fecha");
    expect(mocks.repositorio.crearDelDia).not.toHaveBeenCalled();
  });

  it("materializar falla como error interno si la clase no aparece después de crearla", async () => {
    mocks.repositorio.buscarPorHorarioYFecha.mockResolvedValue(null);

    await expect(servicio.materializar(4, HOY)).rejects.not.toBeInstanceOf(NotFoundError);
  });

  it("bloquearParaSuplencia bloquea la clase y la devuelve, aunque esté DICTADA", async () => {
    mocks.repositorio.bloquear.mockResolvedValue("DICTADA");

    await expect(servicio.bloquearParaSuplencia(20)).resolves.toBe(claseDeHoy);
    expect(mocks.repositorio.bloquear).toHaveBeenCalledWith(20);
  });

  it("bloquearParaSuplencia lanza NotFoundError si la clase no existe", async () => {
    mocks.repositorio.bloquear.mockResolvedValue(null);

    await expect(servicio.bloquearParaSuplencia(20)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("bloquearParaSuplencia rechaza una clase CANCELADA", async () => {
    mocks.repositorio.bloquear.mockResolvedValue("CANCELADA");

    await expect(servicio.bloquearParaSuplencia(20)).rejects.toBeInstanceOf(ConflictError);
  });

  it("bloquearParaSuplencia falla como error interno si la clase bloqueada no se encuentra", async () => {
    mocks.repositorio.bloquear.mockResolvedValue("PROGRAMADA");
    mocks.repositorio.buscarPorId.mockResolvedValue(null);

    await expect(servicio.bloquearParaSuplencia(20)).rejects.not.toBeInstanceOf(NotFoundError);
  });

  it("cambiarDictante y listarSuplidasEnPeriodo se delegan en el repositorio", async () => {
    const desde = new Date("2026-10-01T00:00:00Z");
    mocks.repositorio.listarSuplidasEnPeriodo.mockResolvedValue(["suplida"]);

    await servicio.cambiarDictante(20, 9);
    await expect(servicio.listarSuplidasEnPeriodo(desde, HOY)).resolves.toEqual(["suplida"]);

    expect(mocks.repositorio.cambiarDictante).toHaveBeenCalledWith(20, 9);
    expect(mocks.repositorio.listarSuplidasEnPeriodo).toHaveBeenCalledWith(desde, HOY);
  });
});
