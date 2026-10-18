import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../../shared/db/transaccion.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.types.js";
import type { IInfoInscripciones } from "../../inscripcion/interface/i-info-inscripciones.js";
import type { ClaseConDatos } from "../../clase/clase.types.js";
import type { IInfoClases } from "../../clase/interface/i-info-clases.js";
import type { AsistenciaRepository } from "../asistencia.repository.js";
import { AsistenciaService } from "../asistencia.service.js";

const AHORA = new Date("2026-10-12T21:15:00Z");
const FECHA_CLASE = new Date("2026-10-12T00:00:00Z");
const PROFESORA: Solicitante = { idUsuario: 2, esPropietaria: false };
const clase = { id_clase: 20, id_horario: 4, fecha_clase: FECHA_CLASE } as ClaseConDatos;
const ana = { id_alumno: 5, id_inscripcion: 50, alumno: { usuario: { nombre: "Ana", apellido: "Paz" } } };
const beto = { id_alumno: 6, id_inscripcion: 60, alumno: { usuario: { nombre: "Beto", apellido: "Sosa" } } };
const caro = { id_alumno: 7, id_inscripcion: 70, alumno: { usuario: { nombre: "Caro", apellido: "Ruiz" } } };

function crearMocks() {
  return {
    repositorio: {
      listarDeClase: vi.fn().mockResolvedValue([]),
      marcar: vi.fn(),
      marcarPresentes: vi.fn(),
      tieneMarcasManuales: vi.fn(),
      completarAusentes: vi.fn().mockResolvedValue(2),
      rachasDeInasistencia: vi.fn().mockResolvedValue(new Map()),
      buscarSeguimientos: vi.fn().mockResolvedValue(new Map()),
      ultimasPresenciasRegistradas: vi.fn().mockResolvedValue(new Map()),
      registrarSeguimiento: vi.fn().mockResolvedValue({ id_inscripcion: 50 }),
      quitarSeguimiento: vi.fn().mockResolvedValue(true),
    },
    clases: {
      obtenerPara: vi.fn().mockResolvedValue(clase),
      bloquearParaMarcar: vi.fn(),
    },
    inscripciones: {
      listarParaAsistencia: vi.fn().mockResolvedValue([ana, beto, caro]),
      buscarParaAsistencia: vi.fn().mockResolvedValue(ana),
    },
    unidadDeTrabajo: { ejecutar: vi.fn(<T>(operacion: () => Promise<T>) => operacion()) },
  };
}

describe("AsistenciaService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: AsistenciaService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    mocks = crearMocks();
    servicio = new AsistenciaService(
      mocks.repositorio as unknown as AsistenciaRepository,
      mocks.clases as unknown as IInfoClases,
      mocks.inscripciones as unknown as IInfoInscripciones,
      mocks.unidadDeTrabajo as unknown as IUnidadDeTrabajo,
    );
  });

  afterEach(() => vi.useRealTimers());

  it("listarDeClase lista los inscriptos vigentes del horario el día de la clase con su marca", async () => {
    mocks.repositorio.listarDeClase.mockResolvedValue([
      { id_alumno: 5, asistio: true, observaciones: "Llegó tarde" },
      { id_alumno: 6, asistio: false, observaciones: null },
      { id_alumno: 99, asistio: true, observaciones: null },
    ]);

    const lista = await servicio.listarDeClase(clase);

    expect(mocks.inscripciones.listarParaAsistencia).toHaveBeenCalledWith(4, FECHA_CLASE);
    expect(mocks.repositorio.listarDeClase).toHaveBeenCalledWith(20);
    expect(lista).toEqual([
      {
        id_alumno: 5,
        id_inscripcion: 50,
        nombre: "Ana",
        apellido: "Paz",
        asistencia: "presente",
        observaciones: "Llegó tarde",
      },
      {
        id_alumno: 6,
        id_inscripcion: 60,
        nombre: "Beto",
        apellido: "Sosa",
        asistencia: "ausente",
        observaciones: null,
      },
      {
        id_alumno: 7,
        id_inscripcion: 70,
        nombre: "Caro",
        apellido: "Ruiz",
        asistencia: "sin_marcar",
        observaciones: null,
      },
    ]);
  });

  it("marcar comprueba la clase, toma su bloqueo y guarda la marca con quién y cuándo", async () => {
    await servicio.marcar(20, 5, { asistio: true }, PROFESORA);

    expect(mocks.clases.obtenerPara).toHaveBeenCalledWith(20, PROFESORA);
    expect(mocks.unidadDeTrabajo.ejecutar).toHaveBeenCalledTimes(1);
    expect(mocks.clases.bloquearParaMarcar).toHaveBeenCalledWith(20, PROFESORA);
    expect(mocks.inscripciones.buscarParaAsistencia).toHaveBeenCalledWith(4, 5, FECHA_CLASE);
    expect(mocks.repositorio.marcar).toHaveBeenCalledWith(
      ana,
      { asistio: true },
      {
        idClase: 20,
        idUsuario: 2,
        fechaRegistro: AHORA,
      },
    );
  });

  it("marcar no guarda nada si la clase no admite marcas", async () => {
    mocks.clases.bloquearParaMarcar.mockRejectedValue(new ConflictError("cerrada"));

    await expect(servicio.marcar(20, 5, { asistio: true }, PROFESORA)).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.repositorio.marcar).not.toHaveBeenCalled();
  });

  it("marcar lanza NotFoundError a un alumno que no está inscripto en el horario ese día", async () => {
    mocks.inscripciones.buscarParaAsistencia.mockResolvedValue(null);

    await expect(servicio.marcar(20, 99, { asistio: true }, PROFESORA)).rejects.toThrow(
      new NotFoundError("El alumno no está inscripto en este horario"),
    );
    expect(mocks.repositorio.marcar).not.toHaveBeenCalled();
  });

  it("marcar no llega al bloqueo si la clase no es del solicitante", async () => {
    mocks.clases.obtenerPara.mockRejectedValue(new NotFoundError("Clase no encontrada"));

    await expect(servicio.marcar(20, 5, { asistio: true }, PROFESORA)).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.unidadDeTrabajo.ejecutar).not.toHaveBeenCalled();
  });

  it("marcarTodosPresentes marca presentes a los inscriptos vigentes dentro del bloqueo de la clase", async () => {
    await servicio.marcarTodosPresentes(20, PROFESORA);

    expect(mocks.clases.bloquearParaMarcar).toHaveBeenCalledWith(20, PROFESORA);
    expect(mocks.clases.bloquearParaMarcar.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.inscripciones.listarParaAsistencia.mock.invocationCallOrder[0]!,
    );
    expect(mocks.repositorio.marcarPresentes).toHaveBeenCalledWith([ana, beto, caro], {
      idClase: 20,
      idUsuario: 2,
      fechaRegistro: AHORA,
    });
  });

  it("marcarTodosPresentes no marca a nadie si la clase está cerrada", async () => {
    mocks.clases.bloquearParaMarcar.mockRejectedValue(new ConflictError("cerrada"));

    await expect(servicio.marcarTodosPresentes(20, PROFESORA)).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.repositorio.marcarPresentes).not.toHaveBeenCalled();
  });

  it("tieneMarcasManuales se delega en el repositorio", async () => {
    mocks.repositorio.tieneMarcasManuales.mockResolvedValue(true);

    await expect(servicio.tieneMarcasManuales(20)).resolves.toBe(true);
    expect(mocks.repositorio.tieneMarcasManuales).toHaveBeenCalledWith(20);
  });

  it("completarAusentes registra ausentes a los inscriptos vigentes del día de la clase", async () => {
    await expect(servicio.completarAusentes(clase, AHORA)).resolves.toBe(2);

    expect(mocks.inscripciones.listarParaAsistencia).toHaveBeenCalledWith(4, FECHA_CLASE);
    expect(mocks.repositorio.completarAusentes).toHaveBeenCalledWith(20, [ana, beto, caro], AHORA);
  });

  describe("detección de inactivos (US-22)", () => {
    const MARCA = new Date("2026-10-15T12:00:00Z");
    const ANTES = new Date("2026-10-14T21:00:00Z");
    const DESPUES = new Date("2026-10-16T21:00:00Z");

    it("rachasDeInasistencia, registrarSeguimiento y quitarSeguimiento pasan al repositorio", async () => {
      await expect(servicio.rachasDeInasistencia([50])).resolves.toEqual(new Map());
      expect(mocks.repositorio.rachasDeInasistencia).toHaveBeenCalledWith([50]);
      await expect(servicio.registrarSeguimiento(50, "CONTACTADO", 1)).resolves.toEqual({
        id_inscripcion: 50,
      });
      expect(mocks.repositorio.registrarSeguimiento).toHaveBeenCalledWith(
        50,
        "CONTACTADO",
        1,
        expect.any(Date),
      );
      await expect(servicio.quitarSeguimiento(50)).resolves.toBe(true);
      expect(mocks.repositorio.quitarSeguimiento).toHaveBeenCalledWith(50);
    });

    it("seguimientosVigentes deja la marca sin presencias o con la última antes de marcar, y descarta la que tiene una presencia después", async () => {
      const marca = { estado: "GESTIONADO", fecha_registro: MARCA };
      mocks.repositorio.buscarSeguimientos.mockResolvedValue(
        new Map([
          [50, marca],
          [60, marca],
          [70, marca],
        ]),
      );
      mocks.repositorio.ultimasPresenciasRegistradas.mockResolvedValue(
        new Map([
          [60, ANTES],
          [70, DESPUES],
        ]),
      );

      await expect(servicio.seguimientosVigentes([50, 60, 70, 80])).resolves.toEqual(
        new Map([
          [50, marca],
          [60, marca],
        ]),
      );
      expect(mocks.repositorio.ultimasPresenciasRegistradas).toHaveBeenCalledWith([50, 60, 70, 80]);
    });

    it("seguimientosVigentes no consulta la base sin inscripciones", async () => {
      await expect(servicio.seguimientosVigentes([])).resolves.toEqual(new Map());
      expect(mocks.repositorio.buscarSeguimientos).not.toHaveBeenCalled();
    });
  });
});
