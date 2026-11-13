import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../../../../shared/errors/app-error.js";
import type { IInfoCuotas } from "../../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoAsistencia } from "../../../gestion-inscripciones-y-clases/asistencia/interface/i-info-asistencia.js";
import type { IInfoInscripciones } from "../../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoAlumnos } from "../../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoParametros } from "../../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import { DetectorInactividadService } from "../detector-inactividad.service.js";

const PAGINA = { limit: 50, offset: 0 };
const PLAN = { id_plan: 2, nombre: "Intermedio" };
const LUCIA = { id_profesora: 3, nombre: "Lucía", apellido: "Gómez" };
const MARCA = new Date("2026-10-15T12:00:00Z");

function inscripcion(id: number, idAlumno = id * 10) {
  return { id_inscripcion: id, id_alumno: idAlumno, plan: PLAN, profesora: LUCIA };
}

function racha(inasistencias: number, ultima: string | null = "2026-10-01") {
  return {
    inasistencias_consecutivas: inasistencias,
    fecha_ultima_asistencia: ultima === null ? null : new Date(`${ultima}T00:00:00Z`),
  };
}

function alumno(id: number, responsable: object | null = null) {
  return {
    id_alumno: id,
    usuario: { nombre: `Alumno ${id}`, apellido: "Paz", telefono: "3415550000", email: `a${id}@example.com` },
    responsable,
  };
}

function crearMocks() {
  return {
    inscripciones: { listarParaInactividad: vi.fn().mockResolvedValue([inscripcion(1)]) },
    asistencias: {
      rachasDeInasistencia: vi.fn().mockResolvedValue(new Map([[1, racha(3)]])),
      seguimientosVigentes: vi.fn().mockResolvedValue(new Map()),
      registrarSeguimiento: vi.fn().mockResolvedValue({ id_inscripcion: 1, estado: "CONTACTADO" }),
      quitarSeguimiento: vi.fn().mockResolvedValue(true),
    },
    cuotas: {
      habilitacionDeInscripciones: vi.fn().mockImplementation(async (ids: number[]) => {
        return new Map(ids.map((id) => [id, { estado: "AL_DIA" }]));
      }),
    },
    alumnos: {
      buscarPorIds: vi.fn().mockImplementation(async (ids: number[]) => ids.map((id) => alumno(id))),
    },
    parametros: { obtener: vi.fn().mockResolvedValue(3) },
  };
}

describe("DetectorInactividadService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let detector: DetectorInactividadService;

  beforeEach(() => {
    mocks = crearMocks();
    detector = new DetectorInactividadService(
      mocks.inscripciones as unknown as IInfoInscripciones,
      mocks.asistencias as unknown as IInfoAsistencia,
      mocks.cuotas as unknown as IInfoCuotas,
      mocks.alumnos as unknown as IInfoAlumnos,
      mocks.parametros as unknown as IInfoParametros,
    );
  });

  describe("listar", () => {
    it("devuelve al alumno con la racha del umbral y la cuota al día, con su contacto y la gestión pendiente", async () => {
      const pagina = await detector.listar({ ...PAGINA, id_profesora: 3, id_plan: 2 });

      expect(mocks.parametros.obtener).toHaveBeenCalledWith("INASISTENCIAS_CONSECUTIVAS_INACTIVO");
      expect(mocks.inscripciones.listarParaInactividad).toHaveBeenCalledWith({ id_profesora: 3, id_plan: 2 });
      expect(pagina).toEqual({
        datos: [
          {
            id_inscripcion: 1,
            alumno: {
              id_alumno: 10,
              nombre: "Alumno 10",
              apellido: "Paz",
              telefono: "3415550000",
              email: "a10@example.com",
            },
            tutor: null,
            profesora: LUCIA,
            plan: PLAN,
            estado_cuota: "AL_DIA",
            inasistencias_consecutivas: 3,
            fecha_ultima_asistencia: new Date("2026-10-01T00:00:00Z"),
            gestion: { estado: "PENDIENTE", fecha_registro: null },
          },
        ],
        total: 1,
        umbral: 3,
        limit: 50,
        offset: 0,
      });
    });

    it.each([
      [2, false],
      [3, true],
      [5, true],
    ])("con %i inasistencias seguidas y el umbral en 3, aparece: %s", async (inasistencias, aparece) => {
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(new Map([[1, racha(inasistencias)]]));

      const { total } = await detector.listar(PAGINA);

      expect(total).toBe(aparece ? 1 : 0);
    });

    it("una inscripción sin marcas en clases cerradas no aplica, y solo pide cuotas de las que superan el umbral", async () => {
      mocks.inscripciones.listarParaInactividad.mockResolvedValue([
        inscripcion(1),
        inscripcion(2),
        inscripcion(3),
      ]);
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(
        new Map([
          [1, racha(4)],
          [2, racha(1)],
        ]),
      );

      const { datos } = await detector.listar(PAGINA);

      expect(datos.map(({ id_inscripcion }) => id_inscripcion)).toEqual([1]);
      expect(mocks.asistencias.rachasDeInasistencia).toHaveBeenCalledWith([1, 2, 3]);
      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([1]);
      expect(mocks.asistencias.seguimientosVigentes).toHaveBeenCalledWith([1]);
    });

    it.each([
      ["AL_DIA", true],
      ["POR_VENCER", true],
      ["VENCIDA", false],
      ["PENDIENTE_DE_PAGO", false],
    ])("con la cuota %s, aparece: %s", async (estado, aparece) => {
      mocks.cuotas.habilitacionDeInscripciones.mockResolvedValue(new Map([[1, { estado }]]));

      const { datos } = await detector.listar(PAGINA);

      expect(datos.map(({ estado_cuota }) => estado_cuota)).toEqual(aparece ? [estado] : []);
    });

    it("una inscripción sin habilitación no aparece", async () => {
      mocks.cuotas.habilitacionDeInscripciones.mockResolvedValue(new Map());

      await expect(detector.listar(PAGINA)).resolves.toMatchObject({ datos: [], total: 0 });
    });

    it("el mínimo de inasistencias del filtro sube el umbral, pero no lo baja", async () => {
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(new Map([[1, racha(4)]]));

      await expect(detector.listar({ ...PAGINA, minimo_inasistencias: 5 })).resolves.toMatchObject({
        total: 0,
      });
      await expect(detector.listar({ ...PAGINA, minimo_inasistencias: 1 })).resolves.toMatchObject({
        total: 1,
      });
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(new Map([[1, racha(2)]]));
      await expect(detector.listar({ ...PAGINA, minimo_inasistencias: 1 })).resolves.toMatchObject({
        total: 0,
      });
    });

    it("ordena por más inasistencias y, a igual racha, por la última asistencia más vieja, sin asistencias primero", async () => {
      mocks.inscripciones.listarParaInactividad.mockResolvedValue([1, 2, 3, 4].map((id) => inscripcion(id)));
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(
        new Map([
          [1, racha(3, "2026-10-05")],
          [2, racha(6)],
          [3, racha(3, null)],
          [4, racha(3, "2026-09-20")],
        ]),
      );

      const { datos } = await detector.listar(PAGINA);

      expect(datos.map(({ id_inscripcion }) => id_inscripcion)).toEqual([2, 3, 4, 1]);
    });

    it("a igual racha y fecha, desempata por inscripción", async () => {
      mocks.inscripciones.listarParaInactividad.mockResolvedValue([inscripcion(2), inscripcion(1)]);
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(
        new Map([
          [1, racha(3)],
          [2, racha(3)],
        ]),
      );

      const { datos } = await detector.listar(PAGINA);

      expect(datos.map(({ id_inscripcion }) => id_inscripcion)).toEqual([1, 2]);
    });

    it("sin filtro no muestra los IGNORADO; con el filtro muestra solo los de ese estado", async () => {
      mocks.inscripciones.listarParaInactividad.mockResolvedValue([1, 2, 3].map((id) => inscripcion(id)));
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(
        new Map([1, 2, 3].map((id) => [id, racha(3)])),
      );
      mocks.asistencias.seguimientosVigentes.mockResolvedValue(
        new Map([
          [2, { estado: "IGNORADO", fecha_registro: MARCA }],
          [3, { estado: "CONTACTADO", fecha_registro: MARCA }],
        ]),
      );
      const ids = async (estado_gestion?: "PENDIENTE" | "IGNORADO" | "CONTACTADO") =>
        (await detector.listar({ ...PAGINA, estado_gestion })).datos.map(
          ({ id_inscripcion }) => id_inscripcion,
        );

      expect(await ids()).toEqual([1, 3]);
      expect(await ids("IGNORADO")).toEqual([2]);
      expect(await ids("PENDIENTE")).toEqual([1]);
      const [contactado] = (await detector.listar({ ...PAGINA, estado_gestion: "CONTACTADO" })).datos;
      expect(contactado.gestion).toEqual({ estado: "CONTACTADO", fecha_registro: MARCA });
    });

    it("con incluir_ignorados muestra también los IGNORADO, sin filtro de estado", async () => {
      mocks.inscripciones.listarParaInactividad.mockResolvedValue([1, 2, 3].map((id) => inscripcion(id)));
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(
        new Map([1, 2, 3].map((id) => [id, racha(3)])),
      );
      mocks.asistencias.seguimientosVigentes.mockResolvedValue(
        new Map([
          [2, { estado: "IGNORADO", fecha_registro: MARCA }],
          [3, { estado: "CONTACTADO", fecha_registro: MARCA }],
        ]),
      );

      const { datos } = await detector.listar({ ...PAGINA, incluir_ignorados: true });

      expect(datos.map(({ id_inscripcion }) => id_inscripcion).sort()).toEqual([1, 2, 3]);
    });

    it("pagina en memoria y busca solo los alumnos de la página, una vez cada uno", async () => {
      mocks.inscripciones.listarParaInactividad.mockResolvedValue([
        inscripcion(1, 10),
        inscripcion(2, 10),
        inscripcion(3, 30),
      ]);
      mocks.asistencias.rachasDeInasistencia.mockResolvedValue(
        new Map([
          [1, racha(5)],
          [2, racha(4)],
          [3, racha(3)],
        ]),
      );

      const pagina = await detector.listar({ limit: 2, offset: 0 });

      expect(pagina).toMatchObject({ total: 3, limit: 2, offset: 0 });
      expect(pagina.datos.map(({ id_inscripcion }) => id_inscripcion)).toEqual([1, 2]);
      expect(mocks.alumnos.buscarPorIds).toHaveBeenCalledWith([10]);
    });

    it("una página vacía no busca alumnos", async () => {
      await expect(detector.listar({ limit: 50, offset: 10 })).resolves.toMatchObject({
        datos: [],
        total: 1,
      });
      expect(mocks.alumnos.buscarPorIds).not.toHaveBeenCalled();
    });

    it("trae el contacto del tutor de un menor", async () => {
      const tutora = {
        nombre: "Paula",
        apellido: "Romero",
        telefono: null,
        email: "paula@example.com",
        dni: "1",
      };
      mocks.alumnos.buscarPorIds.mockResolvedValue([alumno(10, tutora)]);

      const [fila] = (await detector.listar(PAGINA)).datos;

      expect(fila.tutor).toEqual({
        nombre: "Paula",
        apellido: "Romero",
        telefono: null,
        email: "paula@example.com",
      });
    });
  });

  describe("registrarSeguimiento", () => {
    it("guarda la marca de una inscripción que puede aparecer en el listado", async () => {
      await expect(detector.registrarSeguimiento(1, "CONTACTADO", 7)).resolves.toEqual({
        id_inscripcion: 1,
        estado: "CONTACTADO",
      });
      expect(mocks.inscripciones.listarParaInactividad).toHaveBeenCalledWith({ id_inscripcion: 1 });
      expect(mocks.asistencias.registrarSeguimiento).toHaveBeenCalledWith(1, "CONTACTADO", 7);
    });

    it("lanza NotFoundError si la inscripción no existe, no está activa o no es de plan mensual", async () => {
      mocks.inscripciones.listarParaInactividad.mockResolvedValue([]);

      await expect(detector.registrarSeguimiento(1, "CONTACTADO", 7)).rejects.toThrow(NotFoundError);
      expect(mocks.asistencias.registrarSeguimiento).not.toHaveBeenCalled();
    });
  });

  describe("quitarSeguimiento", () => {
    it("quita la marca", async () => {
      await expect(detector.quitarSeguimiento(1)).resolves.toBeUndefined();
      expect(mocks.asistencias.quitarSeguimiento).toHaveBeenCalledWith(1);
    });

    it("lanza NotFoundError si no había marca", async () => {
      mocks.asistencias.quitarSeguimiento.mockResolvedValue(false);

      await expect(detector.quitarSeguimiento(1)).rejects.toThrow(NotFoundError);
    });
  });
});
