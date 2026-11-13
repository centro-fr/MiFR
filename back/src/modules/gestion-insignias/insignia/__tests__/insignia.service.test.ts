import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.types.js";
import { CalculadorRachaRanking } from "../../../calculos-del-negocio/calculador-racha-ranking/calculador-racha-ranking.js";
import type { MarcaDeHistorial } from "../../../calculos-del-negocio/calculador-racha-ranking/calculador-racha-ranking.types.js";
import type { AsistenciaDeAlumno } from "../../../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type { IInfoAsistencia } from "../../../gestion-inscripciones-y-clases/asistencia/interface/i-info-asistencia.js";
import type { IInfoAlumnos } from "../../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoParametros } from "../../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { InsigniaRepository } from "../insignia.repository.js";
import { InsigniaService } from "../insignia.service.js";
import type { Insignia, InsigniaObtenida } from "../insignia.types.js";

const ALUMNA: Solicitante = { idUsuario: 50, esPropietaria: false };
const TUTOR: Solicitante = { idUsuario: 90, esPropietaria: false };
const OTRO: Solicitante = { idUsuario: 77, esPropietaria: false };
const PROPIETARIA: Solicitante = { idUsuario: 1, esPropietaria: true };
const AHORA = new Date("2026-10-01T03:30:00Z");

function insignia(
  id_insignia: number,
  codigo: string,
  tipo: Insignia["tipo"],
  valor_umbral: number,
): Insignia {
  return { id_insignia, codigo, nombre: codigo, descripcion: null, tipo, valor_umbral };
}

const RACHA_3 = insignia(1, "RACHA_3", "RACHA", 3);
const RACHA_5 = insignia(2, "RACHA_5", "RACHA", 5);
const TOTAL_4 = insignia(3, "TOTAL_4", "TOTAL_CLASES", 4);
const MES_PERFECTO = insignia(4, "MES_PERFECTO", "MES_PERFECTO", 100);
const PODIO = insignia(5, "PODIO_MES", "PODIO_MES", 3);
const CATALOGO = [MES_PERFECTO, RACHA_3, RACHA_5, TOTAL_4, PODIO];

// Una marca por día desde el 1/10/2026, en el orden de la cadena: "P" presente, "A" ausente.
function marcas(secuencia: string): MarcaDeHistorial[] {
  return [...secuencia].map((letra, indice) => ({ asistio: letra === "P", inicio: dia(indice + 1) }));
}

function dia(numero: number): Date {
  return new Date(Date.UTC(2026, 9, numero, 21));
}

function obtenida(id_alumno: number, de: Insignia, periodo = "", fecha = dia(1)): InsigniaObtenida {
  return { id_alumno, id_insignia: de.id_insignia, periodo, fecha_obtencion: fecha, insignia: de };
}

function fila(
  id_alumno: number,
  apellido: string,
  clases_previstas: number,
  clases_asistidas: number,
  extra: Partial<AsistenciaDeAlumno> = {},
): AsistenciaDeAlumno {
  return {
    id_alumno,
    id_usuario: id_alumno * 10,
    id_usuario_responsable: null,
    nombre: "Nombre",
    apellido,
    estado: "ACTIVO",
    clases_previstas,
    clases_asistidas,
    ...extra,
  };
}

function crearMocks() {
  return {
    repositorio: {
      listarCatalogo: vi.fn().mockResolvedValue(CATALOGO),
      listarObtenidas: vi.fn().mockResolvedValue([]),
      otorgar: vi.fn(async (insignias: unknown[]) => insignias.length),
      fueOtorgadaEnPeriodo: vi.fn().mockResolvedValue(false),
    },
    asistencias: {
      historialDeAlumnos: vi.fn().mockResolvedValue(new Map()),
      resumirPorAlumno: vi.fn().mockResolvedValue([]),
    },
    alumnos: {
      buscarPorId: vi.fn().mockResolvedValue({ id_alumno: 5, id_usuario: 50, id_usuario_responsable: 90 }),
    },
    parametros: { obtener: vi.fn().mockResolvedValue(4) },
  };
}

describe("InsigniaService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: InsigniaService;

  beforeEach(() => {
    mocks = crearMocks();
    servicio = new InsigniaService(
      mocks.repositorio as unknown as InsigniaRepository,
      mocks.asistencias as unknown as IInfoAsistencia,
      mocks.alumnos as unknown as IInfoAlumnos,
      mocks.parametros as unknown as IInfoParametros,
      new CalculadorRachaRanking(),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("obtenerFicha (US-31)", () => {
    it("otorga los logros alcanzados con la fecha de la clase en que se alcanzaron, sin las mensuales", async () => {
      mocks.asistencias.historialDeAlumnos.mockResolvedValue(new Map([[5, marcas("PPPAPP")]]));

      await servicio.obtenerFicha(5, ALUMNA);

      expect(mocks.asistencias.historialDeAlumnos).toHaveBeenCalledWith([5]);
      expect(mocks.repositorio.otorgar).toHaveBeenCalledWith([
        { id_alumno: 5, id_insignia: RACHA_3.id_insignia, periodo: "", fecha_obtencion: dia(3) },
        { id_alumno: 5, id_insignia: TOTAL_4.id_insignia, periodo: "", fecha_obtencion: dia(5) },
      ]);
    });

    it("una falta corta la racha: muestra la actual, la mejor, cuándo empezó y el próximo hito", async () => {
      mocks.asistencias.historialDeAlumnos.mockResolvedValue(new Map([[5, marcas("PPPAPP")]]));
      mocks.repositorio.listarObtenidas.mockResolvedValue([
        obtenida(5, RACHA_3, "", dia(3)),
        obtenida(5, TOTAL_4, "", dia(5)),
      ]);

      const ficha = await servicio.obtenerFicha(5, ALUMNA);

      expect(ficha).toMatchObject({
        id_alumno: 5,
        racha: { actual: 2, mejor: 3, fecha_inicio: dia(5), proximo_hito: { umbral: 3, faltantes: 1 } },
        clases_asistidas: 5,
        proximo_hito_clases: null,
      });
    });

    it("devuelve el catálogo entero con lo obtenido, los meses de las mensuales y el progreso de las de historial", async () => {
      mocks.asistencias.historialDeAlumnos.mockResolvedValue(new Map([[5, marcas("PPPAPP")]]));
      mocks.repositorio.listarObtenidas.mockResolvedValue([
        obtenida(5, MES_PERFECTO, "2026-08", dia(1)),
        obtenida(5, RACHA_3, "", dia(3)),
        obtenida(5, MES_PERFECTO, "2026-09", dia(2)),
      ]);

      const { insignias } = await servicio.obtenerFicha(5, ALUMNA);

      expect(insignias).toEqual([
        {
          codigo: "MES_PERFECTO",
          nombre: "MES_PERFECTO",
          descripcion: null,
          tipo: "MES_PERFECTO",
          valor_umbral: 100,
          obtenida: true,
          fecha_obtencion: dia(1),
          periodos: ["2026-08", "2026-09"],
          progreso: null,
        },
        expect.objectContaining({
          codigo: "RACHA_3",
          obtenida: true,
          periodos: [],
          progreso: { actual: 3, umbral: 3 },
        }),
        expect.objectContaining({
          codigo: "RACHA_5",
          obtenida: false,
          fecha_obtencion: null,
          progreso: { actual: 2, umbral: 5 },
        }),
        expect.objectContaining({ codigo: "TOTAL_4", obtenida: false, progreso: { actual: 4, umbral: 4 } }),
        expect.objectContaining({ codigo: "PODIO_MES", obtenida: false, progreso: null }),
      ]);
    });

    it("sin asistencias la ficha queda en cero y no otorga nada", async () => {
      const ficha = await servicio.obtenerFicha(5, ALUMNA);

      expect(mocks.repositorio.otorgar).toHaveBeenCalledWith([]);
      expect(ficha.racha).toEqual({
        actual: 0,
        mejor: 0,
        fecha_inicio: null,
        proximo_hito: { umbral: 3, faltantes: 3 },
      });
      expect(ficha.proximo_hito_clases).toEqual({ umbral: 4, faltantes: 4 });
    });

    it("el tutor ve la ficha de su menor a cargo y la propietaria la de cualquiera", async () => {
      await expect(servicio.obtenerFicha(5, TUTOR)).resolves.toMatchObject({ id_alumno: 5 });
      await expect(servicio.obtenerFicha(5, PROPIETARIA)).resolves.toMatchObject({ id_alumno: 5 });
    });

    it("responde 403 a otro alumno sin leer su historial", async () => {
      await expect(servicio.obtenerFicha(5, OTRO)).rejects.toThrow(ForbiddenError);
      expect(mocks.asistencias.historialDeAlumnos).not.toHaveBeenCalled();
    });

    it("a quien no es la propietaria, un alumno inexistente le responde 403 igual que uno ajeno", async () => {
      mocks.alumnos.buscarPorId.mockResolvedValue(null);

      await expect(servicio.obtenerFicha(99, ALUMNA)).rejects.toThrow(ForbiddenError);
    });

    it("a la propietaria, un alumno inexistente le responde 404", async () => {
      mocks.alumnos.buscarPorId.mockResolvedValue(null);

      await expect(servicio.obtenerFicha(99, PROPIETARIA)).rejects.toThrow(NotFoundError);
    });
  });

  describe("consultarRanking (US-30)", () => {
    const filtro = { limit: 50, offset: 0 };

    it("por defecto toma el mes en curso hasta hoy y lee RANKING_MINIMO_CLASES", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));

      const ranking = await servicio.consultarRanking(filtro, ALUMNA);

      expect(mocks.asistencias.resumirPorAlumno).toHaveBeenCalledWith({
        desde: new Date("2026-10-01T00:00:00Z"),
        hasta: new Date("2026-10-20T00:00:00Z"),
        id_actividad: undefined,
      });
      expect(mocks.parametros.obtener).toHaveBeenCalledWith("RANKING_MINIMO_CLASES");
      expect(ranking).toEqual({
        periodo: { desde: new Date("2026-10-01T00:00:00Z"), hasta: new Date("2026-10-20T00:00:00Z") },
        actividad: null,
        minimo_clases: 4,
        datos: [],
        propias: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it("con solo hasta arranca el primer día de ese mes y pasa la actividad", async () => {
      const ranking = await servicio.consultarRanking(
        { ...filtro, hasta: new Date("2026-09-15T00:00:00Z"), actividad: 3 },
        ALUMNA,
      );

      expect(mocks.asistencias.resumirPorAlumno).toHaveBeenCalledWith({
        desde: new Date("2026-09-01T00:00:00Z"),
        hasta: new Date("2026-09-15T00:00:00Z"),
        id_actividad: 3,
      });
      expect(ranking.actividad).toBe(3);
    });

    it("deja afuera a quien no llega al mínimo y ordena por porcentaje, asistidas y apellido", async () => {
      mocks.asistencias.resumirPorAlumno.mockResolvedValue([
        fila(1, "Zapata", 4, 4),
        fila(2, "Álvarez", 8, 8),
        fila(3, "Paz", 3, 3),
        fila(4, "Gómez", 4, 2),
        fila(6, "Báez", 4, 4),
      ]);

      const { datos, total } = await servicio.consultarRanking(
        { ...filtro, desde: new Date("2026-10-01T00:00:00Z"), hasta: new Date("2026-10-31T00:00:00Z") },
        ALUMNA,
      );

      expect(total).toBe(4);
      expect(
        datos.map(({ posicion, id_alumno, porcentaje_asistencia }) => [
          posicion,
          id_alumno,
          porcentaje_asistencia,
        ]),
      ).toEqual([
        [1, 2, 100],
        [2, 6, 100],
        [3, 1, 100],
        [4, 4, 50],
      ]);
    });

    it("pagina el ranking y devuelve aparte las filas propias, de quien pide o de su menor a cargo", async () => {
      mocks.asistencias.resumirPorAlumno.mockResolvedValue([
        fila(1, "A", 4, 4),
        fila(2, "B", 4, 3),
        fila(5, "C", 4, 2, { id_usuario: 50 }),
        fila(8, "D", 4, 1, { id_usuario_responsable: 50 }),
      ]);

      const ranking = await servicio.consultarRanking({ limit: 2, offset: 0 }, ALUMNA);

      expect(ranking.datos.map(({ id_alumno, es_propia }) => [id_alumno, es_propia])).toEqual([
        [1, false],
        [2, false],
      ]);
      expect(
        ranking.propias.map(({ id_alumno, posicion, es_propia }) => [id_alumno, posicion, es_propia]),
      ).toEqual([
        [5, 3, true],
        [8, 4, true],
      ]);
      expect(mocks.asistencias.historialDeAlumnos).toHaveBeenCalledWith([1, 2, 5, 8]);
    });

    it("cada fila muestra la racha actual y sus insignias una sola vez, sin datos de la cuenta del alumno", async () => {
      mocks.asistencias.resumirPorAlumno.mockResolvedValue([fila(1, "A", 4, 4), fila(2, "B", 4, 4)]);
      mocks.asistencias.historialDeAlumnos.mockResolvedValue(new Map([[1, marcas("PAPPP")]]));
      mocks.repositorio.listarObtenidas.mockResolvedValue([
        obtenida(1, MES_PERFECTO, "2026-08"),
        obtenida(1, MES_PERFECTO, "2026-09"),
        obtenida(1, RACHA_3),
      ]);

      const { datos } = await servicio.consultarRanking(filtro, PROPIETARIA);

      expect(mocks.repositorio.otorgar).toHaveBeenCalledWith([
        { id_alumno: 1, id_insignia: RACHA_3.id_insignia, periodo: "", fecha_obtencion: dia(5) },
        { id_alumno: 1, id_insignia: TOTAL_4.id_insignia, periodo: "", fecha_obtencion: dia(5) },
      ]);
      expect(datos[0]).toEqual({
        posicion: 1,
        id_alumno: 1,
        nombre: "Nombre",
        apellido: "A",
        clases_previstas: 4,
        clases_asistidas: 4,
        porcentaje_asistencia: 100,
        racha_actual: 3,
        insignias: [
          { codigo: "MES_PERFECTO", nombre: "MES_PERFECTO", descripcion: null, tipo: "MES_PERFECTO", valor_umbral: MES_PERFECTO.valor_umbral },
          { codigo: "RACHA_3", nombre: "RACHA_3", descripcion: null, tipo: "RACHA", valor_umbral: 3 },
        ],
        es_propia: false,
      });
      expect(datos[1]).toMatchObject({ id_alumno: 2, racha_actual: 0, insignias: [] });
    });
  });

  describe("cerrarMes", () => {
    it("consulta el mes entero del período, también en febrero", async () => {
      await servicio.cerrarMes("2026-02", AHORA);

      expect(mocks.asistencias.resumirPorAlumno).toHaveBeenCalledWith({
        desde: new Date("2026-02-01T00:00:00Z"),
        hasta: new Date("2026-02-28T00:00:00Z"),
      });
    });

    it("otorga Mes perfecto a quien asistió a todas sus clases dictadas y llegó al mínimo", async () => {
      mocks.asistencias.resumirPorAlumno.mockResolvedValue([
        fila(1, "A", 4, 4),
        fila(2, "B", 3, 3),
        fila(3, "C", 5, 4),
      ]);

      const resumen = await servicio.cerrarMes("2026-09", AHORA);

      expect(mocks.repositorio.otorgar).toHaveBeenCalledWith([
        { id_alumno: 1, id_insignia: MES_PERFECTO.id_insignia, periodo: "2026-09", fecha_obtencion: AHORA },
      ]);
      expect(resumen.mes_perfecto).toBe(1);
    });

    it("da el Podio del mes a los tres primeros del ranking, sin quien no asistió a ninguna", async () => {
      mocks.asistencias.resumirPorAlumno.mockResolvedValue([
        fila(1, "A", 4, 2),
        fila(2, "B", 4, 4),
        fila(3, "C", 4, 3),
        fila(4, "D", 4, 1),
        fila(5, "E", 2, 2),
        fila(6, "F", 6, 0),
      ]);

      const resumen = await servicio.cerrarMes("2026-09", AHORA);

      expect(mocks.repositorio.fueOtorgadaEnPeriodo).toHaveBeenCalledWith(PODIO.id_insignia, "2026-09");
      expect(mocks.repositorio.otorgar).toHaveBeenLastCalledWith(
        [2, 3, 1].map((id_alumno) => ({
          id_alumno,
          id_insignia: PODIO.id_insignia,
          periodo: "2026-09",
          fecha_obtencion: AHORA,
        })),
      );
      expect(resumen).toEqual({ periodo: "2026-09", mes_perfecto: 1, podio: 3 });
    });

    it("no vuelve a dar el podio de un mes que ya lo tiene", async () => {
      mocks.asistencias.resumirPorAlumno.mockResolvedValue([fila(1, "A", 4, 4)]);
      mocks.repositorio.fueOtorgadaEnPeriodo.mockResolvedValue(true);

      const resumen = await servicio.cerrarMes("2026-09", AHORA);

      expect(mocks.repositorio.otorgar).toHaveBeenCalledTimes(1);
      expect(resumen.podio).toBe(0);
    });

    it("las insignias de historial no se otorgan en el cierre", async () => {
      mocks.repositorio.listarCatalogo.mockResolvedValue([RACHA_3, TOTAL_4]);
      mocks.asistencias.resumirPorAlumno.mockResolvedValue([fila(1, "A", 4, 4)]);

      await expect(servicio.cerrarMes("2026-09", AHORA)).resolves.toEqual({
        periodo: "2026-09",
        mes_perfecto: 0,
        podio: 0,
      });
      expect(mocks.repositorio.otorgar).not.toHaveBeenCalled();
    });
  });
});
