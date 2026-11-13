import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoAsistencia } from "../../gestion-inscripciones-y-clases/asistencia/interface/i-info-asistencia.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { AlumnoService } from "../alumno/alumno.service.js";
import type { ListarAlumnoQuery } from "../alumno/alumno.schemas.js";
import type { ProfesorService } from "../profesor/profesor.service.js";
import { GestionPersonasService, TOPE_FILTRO_ESTADO_CUOTA } from "../gestion-personas.service.js";

const PROPIETARIA: Solicitante = { idUsuario: 1, esPropietaria: true };
const PROFESORA: Solicitante = { idUsuario: 2, esPropietaria: false };
const ID_PROFESORA = 7;
const consulta: ListarAlumnoQuery = { limit: 20, offset: 0 };
const VENCIO = new Date("2026-10-03T00:00:00Z");
const HABILITACION = {
  estado: "VENCIDA",
  fechaVencimiento: VENCIO,
  diasRestantes: -6,
  puedeAsistir: false,
  tienePagoPendiente: true,
};
const SITUACION = {
  estado: "VENCIDA",
  fecha_vencimiento: VENCIO,
  dias_restantes: -6,
  puede_asistir: false,
  tiene_pago_pendiente: true,
};
const HISTORIAL = [{ id_cuota: 3, id_inscripcion: 9, plan: "Básico", numero_cuota: 1, pagos: [] }];

function crearMocks() {
  return {
    profesoras: {
      crear: vi.fn(),
      listar: vi.fn(),
      darDeBaja: vi.fn(),
      actualizar: vi.fn(),
      buscarPorUsuario: vi.fn().mockResolvedValue({ id_profesora: ID_PROFESORA }),
    },
    horarios: {
      buscarPorIds: vi.fn(),
      tieneActivosDeProfesora: vi.fn().mockResolvedValue(false),
    },
    alumnos: {
      crear: vi.fn(),
      listar: vi.fn(async ({ limit, offset }) => ({ datos: [{ id_alumno: 4 }], total: 1, limit, offset })),
      listarIds: vi.fn().mockResolvedValue([4]),
      buscarPorIds: vi.fn(async (ids: number[]) => ids.map((id_alumno) => ({ id_alumno }))),
      obtenerPorId: vi.fn().mockResolvedValue({ id_alumno: 4 }),
      actualizar: vi.fn().mockResolvedValue({ id_alumno: 4 }),
      listarConsultables: vi.fn().mockResolvedValue([]),
    },
    inscripciones: {
      obtenerIdsDeAlumnos: vi.fn().mockResolvedValue([4]),
      resumirInscripcionesVigentes: vi
        .fn()
        .mockResolvedValue([{ id_alumno: 4, id_inscripcion: 9, nombre_plan: "Básico" }]),
      listarVigentesDeAlumno: vi.fn().mockResolvedValue([{ id_inscripcion: 9, id_profesora: ID_PROFESORA }]),
      listarDeLaUltimaBaja: vi.fn().mockResolvedValue([{ id_inscripcion: 8, id_profesora: ID_PROFESORA }]),
      buscarCambiosProgramados: vi.fn().mockResolvedValue([]),
      contarLugaresOcupados: vi.fn().mockResolvedValue(new Map()),
    },
    asistencias: {
      historialDelAlumno: vi.fn().mockResolvedValue({ datos: [], total: 0, presentes: 0, ausentes: 0 }),
    },
    cuotas: {
      habilitacionDeInscripciones: vi.fn().mockResolvedValue(
        new Map([
          [8, HABILITACION],
          [9, HABILITACION],
        ]),
      ),
      historialDeAlumno: vi.fn().mockResolvedValue(HISTORIAL),
    },
  };
}

describe("GestionPersonasService", () => {
  let mocks: ReturnType<typeof crearMocks>;
  let servicio: GestionPersonasService;

  beforeEach(() => {
    mocks = crearMocks();
    servicio = new GestionPersonasService(
      mocks.profesoras as unknown as ProfesorService,
      mocks.horarios as unknown as IInfoHorarios,
      mocks.alumnos as unknown as AlumnoService,
      mocks.inscripciones as unknown as IInfoInscripciones,
      mocks.cuotas as unknown as IInfoCuotas,
      mocks.asistencias as unknown as IInfoAsistencia,
    );
  });

  describe("profesoras", () => {
    it("crearProfesora y listarProfesoras llegan al componente Profesor", async () => {
      mocks.profesoras.crear.mockResolvedValue({ id_profesora: 1 });
      mocks.profesoras.listar.mockResolvedValue([]);

      await expect(servicio.crearProfesora({ id_usuario: 5 })).resolves.toEqual({ id_profesora: 1 });
      await expect(servicio.listarProfesoras()).resolves.toEqual([]);
      expect(mocks.profesoras.crear).toHaveBeenCalledWith({ id_usuario: 5 });
    });

    it("listarProfesoras solicita los datos de contacto solo para la propietaria", async () => {
      await servicio.listarProfesoras(undefined, true);
      await servicio.listarProfesoras(undefined, false);

      expect(mocks.profesoras.listar).toHaveBeenNthCalledWith(1, undefined, true);
      expect(mocks.profesoras.listar).toHaveBeenNthCalledWith(2, undefined, false);
    });

    it("actualizarProfesora llega al componente Profesor", async () => {
      mocks.profesoras.actualizar.mockResolvedValue({ id_profesora: 1 });

      await expect(servicio.actualizarProfesora(1, { especialidad: "Posing" })).resolves.toEqual({
        id_profesora: 1,
      });
      expect(mocks.profesoras.actualizar).toHaveBeenCalledWith(1, { especialidad: "Posing" });
    });

    it("darDeBajaProfesora permite la baja si no tiene horarios activos", async () => {
      mocks.profesoras.darDeBaja.mockResolvedValue({ id_profesora: 3 });

      await expect(servicio.darDeBajaProfesora(3)).resolves.toEqual({ id_profesora: 3 });
      expect(mocks.profesoras.darDeBaja).toHaveBeenCalledWith(3);
    });

    it("darDeBajaProfesora bloquea la baja si tiene horarios activos", async () => {
      mocks.horarios.tieneActivosDeProfesora.mockResolvedValue(true);

      await expect(servicio.darDeBajaProfesora(3)).rejects.toThrow(ConflictError);
      expect(mocks.profesoras.darDeBaja).not.toHaveBeenCalled();
    });
  });

  describe("listarAlumnos", () => {
    it("la propietaria sin filtros de inscripción lista sin restringir por ids", async () => {
      const pagina = await servicio.listarAlumnos(consulta, PROPIETARIA);

      expect(mocks.inscripciones.obtenerIdsDeAlumnos).not.toHaveBeenCalled();
      expect(mocks.alumnos.listar).toHaveBeenCalledWith({ limit: 20, offset: 0, ids: undefined });
      expect(pagina.datos).toEqual([
        {
          id_alumno: 4,
          inscripcion: { id_alumno: 4, id_inscripcion: 9, nombre_plan: "Básico" },
          situacion_cuota: SITUACION,
          inscripciones: [
            { id_alumno: 4, id_inscripcion: 9, nombre_plan: "Básico", situacion_cuota: SITUACION },
          ],
        },
      ]);
      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([9]);
    });

    it("un alumno con varios planes trae todas sus vigentes y lo representa la más reciente", async () => {
      const AL_DIA = { ...HABILITACION, estado: "AL_DIA" };
      mocks.inscripciones.resumirInscripcionesVigentes.mockResolvedValue([
        { id_alumno: 4, id_inscripcion: 9, nombre_plan: "Básico" },
        { id_alumno: 4, id_inscripcion: 7, nombre_plan: "Intermedio" },
      ]);
      mocks.cuotas.habilitacionDeInscripciones.mockResolvedValue(
        new Map([
          [9, HABILITACION],
          [7, AL_DIA],
        ]),
      );

      const [alumno] = (await servicio.listarAlumnos(consulta, PROPIETARIA)).datos;

      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([9, 7]);
      expect(alumno.inscripcion).toEqual({ id_alumno: 4, id_inscripcion: 9, nombre_plan: "Básico" });
      expect(alumno.situacion_cuota).toEqual(SITUACION);
      expect(alumno.inscripciones).toEqual([
        { id_alumno: 4, id_inscripcion: 9, nombre_plan: "Básico", situacion_cuota: SITUACION },
        {
          id_alumno: 4,
          id_inscripcion: 7,
          nombre_plan: "Intermedio",
          situacion_cuota: { ...SITUACION, estado: "AL_DIA" },
        },
      ]);
    });

    it("una inscripción que Cuota no encuentra sale sin situación de cuota", async () => {
      mocks.cuotas.habilitacionDeInscripciones.mockResolvedValue(new Map());

      const pagina = await servicio.listarAlumnos(consulta, PROPIETARIA);

      expect(pagina.datos[0].situacion_cuota).toBeNull();
    });

    it("filtra por plan, profesora y actividad con los ids que dan las inscripciones", async () => {
      await servicio.listarAlumnos(
        { ...consulta, id_plan: 1, id_profesora: 2, id_actividad: 3 },
        PROPIETARIA,
      );

      expect(mocks.inscripciones.obtenerIdsDeAlumnos).toHaveBeenCalledWith({
        id_plan: 1,
        id_profesora: 2,
        id_actividad: 3,
      });
      expect(mocks.alumnos.listar).toHaveBeenCalledWith({ limit: 20, offset: 0, ids: [4] });
    });

    it("la profesora solo lista a los alumnos que tiene a cargo", async () => {
      await servicio.listarAlumnos(consulta, PROFESORA);

      expect(mocks.profesoras.buscarPorUsuario).toHaveBeenCalledWith(2);
      expect(mocks.inscripciones.obtenerIdsDeAlumnos).toHaveBeenCalledWith(
        expect.objectContaining({ id_profesora: ID_PROFESORA }),
      );
    });

    it("la profesora que filtra por otra profesora recibe una página vacía", async () => {
      const pagina = await servicio.listarAlumnos({ ...consulta, id_profesora: 99 }, PROFESORA);

      expect(pagina).toEqual({ datos: [], total: 0, limit: 20, offset: 0 });
      expect(mocks.alumnos.listar).not.toHaveBeenCalled();
    });

    it("un usuario sin perfil de profesora activo no tiene alumnos a cargo", async () => {
      mocks.profesoras.buscarPorUsuario.mockResolvedValue(null);

      const pagina = await servicio.listarAlumnos(consulta, PROFESORA);

      expect(pagina.datos).toEqual([]);
      expect(mocks.alumnos.listar).not.toHaveBeenCalled();
    });

    it("sin alumnos que cumplan los filtros no consulta el listado", async () => {
      mocks.inscripciones.obtenerIdsDeAlumnos.mockResolvedValue([]);

      const pagina = await servicio.listarAlumnos({ ...consulta, id_plan: 1 }, PROPIETARIA);

      expect(pagina.total).toBe(0);
      expect(mocks.alumnos.listar).not.toHaveBeenCalled();
    });

    it("un alumno sin inscripción vigente sale con inscripcion null", async () => {
      mocks.inscripciones.resumirInscripcionesVigentes.mockResolvedValue([]);

      const pagina = await servicio.listarAlumnos(consulta, PROPIETARIA);

      expect(pagina.datos).toEqual([
        { id_alumno: 4, inscripcion: null, situacion_cuota: null, inscripciones: [] },
      ]);
    });
  });

  describe("listarAlumnos por estado de cuota", () => {
    const AL_DIA = { ...HABILITACION, estado: "AL_DIA" };

    // Cinco alumnos con inscripción vigente (la del alumno n es la 10n) y uno sin inscripción.
    function conCandidatos(estados: Record<number, typeof HABILITACION>, sinInscripcion: number[] = []) {
      const ids = Object.keys(estados).map(Number);
      mocks.alumnos.listarIds.mockResolvedValue([...ids, ...sinInscripcion]);
      mocks.inscripciones.resumirInscripcionesVigentes.mockResolvedValue(
        ids.map((id) => ({ id_alumno: id, id_inscripcion: id * 10 })),
      );
      mocks.cuotas.habilitacionDeInscripciones.mockResolvedValue(
        new Map(ids.map((id) => [id * 10, estados[id]])),
      );
    }

    it("calcula el estado de todos los candidatos, filtra y pagina en memoria con el total filtrado", async () => {
      conCandidatos({ 1: HABILITACION, 2: AL_DIA, 3: HABILITACION, 4: HABILITACION, 5: AL_DIA }, [6]);

      const pagina = await servicio.listarAlumnos(
        { ...consulta, estado_cuota: "VENCIDA", limit: 2, offset: 1, busqueda: "a" },
        PROPIETARIA,
      );

      expect(mocks.alumnos.listarIds).toHaveBeenCalledWith(
        { busqueda: "a", limit: 2, offset: 1, ids: undefined },
        TOPE_FILTRO_ESTADO_CUOTA + 1,
      );
      expect(mocks.alumnos.listar).not.toHaveBeenCalled();
      expect(mocks.alumnos.buscarPorIds).toHaveBeenCalledWith([3, 4]);
      expect(pagina).toEqual({
        datos: [
          expect.objectContaining({
            id_alumno: 3,
            inscripcion: { id_alumno: 3, id_inscripcion: 30 },
            situacion_cuota: SITUACION,
          }),
          expect.objectContaining({
            id_alumno: 4,
            inscripcion: { id_alumno: 4, id_inscripcion: 40 },
            situacion_cuota: SITUACION,
          }),
        ],
        total: 3,
        limit: 2,
        offset: 1,
      });
    });

    it("respeta el orden del listado aunque los alumnos lleguen en otro orden", async () => {
      conCandidatos({ 2: HABILITACION, 1: HABILITACION });
      mocks.alumnos.listarIds.mockResolvedValue([2, 1]);
      mocks.alumnos.buscarPorIds.mockResolvedValue([{ id_alumno: 1 }, { id_alumno: 2 }]);

      const pagina = await servicio.listarAlumnos({ ...consulta, estado_cuota: "VENCIDA" }, PROPIETARIA);

      expect(pagina.datos.map(({ id_alumno }) => id_alumno)).toEqual([2, 1]);
    });

    it("descarta un alumno cuya cuenta se borró entre las dos consultas", async () => {
      conCandidatos({ 1: HABILITACION, 2: HABILITACION });
      mocks.alumnos.buscarPorIds.mockResolvedValue([{ id_alumno: 2 }]);

      const pagina = await servicio.listarAlumnos({ ...consulta, estado_cuota: "VENCIDA" }, PROPIETARIA);

      expect(pagina.datos.map(({ id_alumno }) => id_alumno)).toEqual([2]);
    });

    it("un alumno sin inscripción vigente no tiene estado de cuota y no sale en ningún filtro", async () => {
      conCandidatos({ 1: HABILITACION }, [6]);

      const pagina = await servicio.listarAlumnos(
        { ...consulta, estado_cuota: "PENDIENTE_DE_PAGO" },
        PROPIETARIA,
      );

      expect(pagina).toEqual({ datos: [], total: 0, limit: 20, offset: 0 });
      expect(mocks.alumnos.buscarPorIds).toHaveBeenCalledWith([]);
    });

    it("con la profesora busca solo entre los alumnos que tiene a cargo", async () => {
      await servicio.listarAlumnos({ ...consulta, estado_cuota: "VENCIDA" }, PROFESORA);

      expect(mocks.inscripciones.obtenerIdsDeAlumnos).toHaveBeenCalledWith(
        expect.objectContaining({ id_profesora: ID_PROFESORA }),
      );
      expect(mocks.alumnos.listarIds).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [4] }),
        TOPE_FILTRO_ESTADO_CUOTA + 1,
      );
    });

    it("rechaza con 400 una búsqueda de más de 500 alumnos, sin calcular ningún estado", async () => {
      mocks.alumnos.listarIds.mockResolvedValue(
        Array.from({ length: TOPE_FILTRO_ESTADO_CUOTA + 1 }, (_, indice) => indice + 1),
      );

      await expect(
        servicio.listarAlumnos({ ...consulta, estado_cuota: "AL_DIA" }, PROPIETARIA),
      ).rejects.toThrow(ValidationError);
      expect(mocks.cuotas.habilitacionDeInscripciones).not.toHaveBeenCalled();
    });

    it("con exactamente 500 candidatos filtra normalmente", async () => {
      const ids = Array.from({ length: TOPE_FILTRO_ESTADO_CUOTA }, (_, indice) => indice + 1);
      conCandidatos(Object.fromEntries(ids.map((id) => [id, AL_DIA])));

      const pagina = await servicio.listarAlumnos({ ...consulta, estado_cuota: "AL_DIA" }, PROPIETARIA);

      expect(pagina.total).toBe(TOPE_FILTRO_ESTADO_CUOTA);
      expect(pagina.datos).toHaveLength(20);
    });
  });

  describe("obtenerAlumnoPorId", () => {
    it("devuelve la ficha con las inscripciones vigentes, su situación de cuota y el historial", async () => {
      await expect(servicio.obtenerAlumnoPorId(4, PROPIETARIA)).resolves.toEqual({
        id_alumno: 4,
        inscripciones: [
          {
            id_inscripcion: 9,
            id_profesora: ID_PROFESORA,
            situacion_cuota: SITUACION,
            cambio_programado: null,
          },
        ],
        inscripciones_de_la_baja: [],
        historial_cuotas: HISTORIAL,
      });
      expect(mocks.cuotas.historialDeAlumno).toHaveBeenCalledWith(4);
      expect(mocks.inscripciones.buscarCambiosProgramados).toHaveBeenCalledWith([9]);
      expect(mocks.inscripciones.listarVigentesDeAlumno).toHaveBeenCalledWith(4);
      expect(mocks.inscripciones.listarDeLaUltimaBaja).not.toHaveBeenCalled();
      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([9]);
    });

    it("la ficha de un alumno dado de baja trae las inscripciones de su última baja con lo que debía (US-08)", async () => {
      mocks.alumnos.obtenerPorId.mockResolvedValue({ id_alumno: 4, estado: "BAJA" });
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);

      await expect(servicio.obtenerAlumnoPorId(4, PROPIETARIA)).resolves.toEqual({
        id_alumno: 4,
        estado: "BAJA",
        inscripciones: [],
        inscripciones_de_la_baja: [
          {
            id_inscripcion: 8,
            id_profesora: ID_PROFESORA,
            situacion_cuota: SITUACION,
            cambio_programado: null,
          },
        ],
        historial_cuotas: HISTORIAL,
      });
      expect(mocks.inscripciones.listarDeLaUltimaBaja).toHaveBeenCalledWith(4);
      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([8]);
    });

    it("cada inscripción trae su cambio de plan programado (US-14)", async () => {
      const cambio = { id_inscripcion: 9, id_plan: 2, nombre_plan: "Intermedio" };
      mocks.inscripciones.buscarCambiosProgramados.mockResolvedValue([cambio]);

      const ficha = await servicio.obtenerAlumnoPorId(4, PROPIETARIA);

      expect(ficha.inscripciones[0].cambio_programado).toEqual(cambio);
    });

    it("la profesora ve la ficha de un alumno a su cargo, sin el historial de pagos", async () => {
      await expect(servicio.obtenerAlumnoPorId(4, PROFESORA)).resolves.toMatchObject({
        id_alumno: 4,
        historial_cuotas: null,
      });
      expect(mocks.cuotas.historialDeAlumno).not.toHaveBeenCalled();
    });

    it("la profesora no ve la ficha de un alumno que no tiene a cargo", async () => {
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([{ id_inscripcion: 9, id_profesora: 99 }]);

      await expect(servicio.obtenerAlumnoPorId(4, PROFESORA)).rejects.toThrow(ForbiddenError);
    });

    it("a la profesora un alumno que no existe le responde 403 como uno ajeno, sin buscarlo", async () => {
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);
      mocks.alumnos.obtenerPorId.mockRejectedValue(new NotFoundError("Alumno no encontrado"));

      await expect(servicio.obtenerAlumnoPorId(999, PROFESORA)).rejects.toThrow(ForbiddenError);
      expect(mocks.alumnos.obtenerPorId).not.toHaveBeenCalled();
    });

    it("a la propietaria un alumno que no existe le responde 404", async () => {
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);
      mocks.alumnos.obtenerPorId.mockRejectedValue(new NotFoundError("Alumno no encontrado"));

      await expect(servicio.obtenerAlumnoPorId(999, PROPIETARIA)).rejects.toThrow(NotFoundError);
    });
  });

  describe("listarAsistenciasAlumno (US-10)", () => {
    const CONSULTA = { asistio: false, limit: 10, offset: 10 };

    it("devuelve la página del historial con las fechas y horas como texto y quien dictó cada clase", async () => {
      mocks.asistencias.historialDelAlumno.mockResolvedValue({
        datos: [
          {
            id_clase: 7,
            fecha_clase: new Date("2026-10-05T00:00:00Z"),
            hora_inicio: new Date("1970-01-01T18:00:00Z"),
            hora_fin: new Date("1970-01-01T19:00:00Z"),
            actividad: "Funcional",
            profesora: { nombre: "Carla", apellido: "Ruiz" },
            asistio: false,
            observaciones: "Avisó",
          },
        ],
        total: 11,
        presentes: 30,
        ausentes: 11,
      });

      await expect(servicio.listarAsistenciasAlumno(4, CONSULTA, PROFESORA)).resolves.toEqual({
        datos: [
          {
            id_clase: 7,
            fecha: "2026-10-05",
            hora_inicio: "18:00",
            hora_fin: "19:00",
            actividad: "Funcional",
            profesora: "Carla Ruiz",
            asistio: false,
            observaciones: "Avisó",
          },
        ],
        total: 11,
        presentes: 30,
        ausentes: 11,
        limit: 10,
        offset: 10,
      });
      expect(mocks.asistencias.historialDelAlumno).toHaveBeenCalledWith(4, CONSULTA);
    });

    it("la profesora no ve el historial de un alumno que no tiene a cargo, ni si existe", async () => {
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([{ id_inscripcion: 9, id_profesora: 99 }]);
      await expect(servicio.listarAsistenciasAlumno(4, CONSULTA, PROFESORA)).rejects.toThrow(ForbiddenError);

      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);
      await expect(servicio.listarAsistenciasAlumno(999, CONSULTA, PROFESORA)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mocks.alumnos.obtenerPorId).not.toHaveBeenCalled();
      expect(mocks.asistencias.historialDelAlumno).not.toHaveBeenCalled();
    });

    it("a la propietaria un alumno que no existe le responde 404, sin consultar asistencias", async () => {
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);
      mocks.alumnos.obtenerPorId.mockRejectedValue(new NotFoundError("Alumno no encontrado"));

      await expect(servicio.listarAsistenciasAlumno(999, CONSULTA, PROPIETARIA)).rejects.toThrow(
        NotFoundError,
      );
      expect(mocks.asistencias.historialDelAlumno).not.toHaveBeenCalled();
    });
  });

  describe("actualizarAlumno", () => {
    it("la propietaria modifica cualquier dato", async () => {
      await servicio.actualizarAlumno(4, { nombre: "Ana", fecha_nacimiento: new Date() }, PROPIETARIA);

      expect(mocks.alumnos.actualizar).toHaveBeenCalled();
      expect(mocks.inscripciones.listarVigentesDeAlumno).not.toHaveBeenCalled();
    });

    it("la profesora modifica contacto y observaciones de un alumno a su cargo", async () => {
      const cambios = { telefono: "3794 445566", observaciones: "Lesión de rodilla" };

      await servicio.actualizarAlumno(4, cambios, PROFESORA);

      expect(mocks.alumnos.actualizar).toHaveBeenCalledWith(4, cambios);
    });

    it("la profesora no modifica datos personales", async () => {
      await expect(servicio.actualizarAlumno(4, { nombre: "Ana" }, PROFESORA)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mocks.alumnos.actualizar).not.toHaveBeenCalled();
    });

    it("la profesora no modifica a un alumno que no tiene a cargo", async () => {
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);

      await expect(servicio.actualizarAlumno(4, { telefono: "3794 445566" }, PROFESORA)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mocks.alumnos.actualizar).not.toHaveBeenCalled();
    });
  });

  it("listarAlumnosConsultables llega al componente Alumno con el usuario de quien pide", async () => {
    const consultables = [{ id_alumno: 4, nombre: "Ana", apellido: "López", estado: "ACTIVO", propio: true }];
    mocks.alumnos.listarConsultables.mockResolvedValue(consultables);

    expect(await servicio.listarAlumnosConsultables(PROFESORA)).toBe(consultables);
    expect(mocks.alumnos.listarConsultables).toHaveBeenCalledWith(PROFESORA.idUsuario);
  });

  describe("crearAlumno", () => {
    const tutor = {
      id_usuario: 20,
      nombre: "Laura",
      apellido: "Pérez",
      dni: "30111222",
      email: "laura@example.com",
      telefono: "3794 112233",
      fecha_nacimiento: new Date("1985-03-02"),
      direccion: "Calle 1",
      estado: "ACTIVO",
    };

    it("llega al componente Alumno y a la propietaria le devuelve el tutor completo", async () => {
      mocks.alumnos.crear.mockResolvedValue({ id_alumno: 4, responsable: tutor });

      await expect(servicio.crearAlumno({ nombre: "Ana" } as never, PROPIETARIA)).resolves.toEqual({
        id_alumno: 4,
        responsable: tutor,
      });
    });

    it("a la profesora le devuelve del tutor solo id, nombre y apellido", async () => {
      mocks.alumnos.crear.mockResolvedValue({ id_alumno: 4, responsable: tutor });

      await expect(servicio.crearAlumno({ nombre: "Ana" } as never, PROFESORA)).resolves.toEqual({
        id_alumno: 4,
        responsable: { id_usuario: 20, nombre: "Laura", apellido: "Pérez" },
      });
    });

    it("a la profesora le devuelve un alumno sin tutor tal cual", async () => {
      mocks.alumnos.crear.mockResolvedValue({ id_alumno: 4, responsable: null });

      await expect(servicio.crearAlumno({ nombre: "Ana" } as never, PROFESORA)).resolves.toEqual({
        id_alumno: 4,
        responsable: null,
      });
    });

    it("pasa al componente quién pide, que decide si puede elegir un tutor existente", async () => {
      mocks.alumnos.crear.mockResolvedValue({ id_alumno: 4, responsable: null });

      await servicio.crearAlumno({ nombre: "Ana", tutor: { id_usuario: 20 } } as never, PROFESORA);

      expect(mocks.alumnos.crear).toHaveBeenCalledWith(
        { nombre: "Ana", tutor: { id_usuario: 20 } },
        PROFESORA,
      );
    });
  });

  describe("obtenerPanelAlumno (US-29)", () => {
    const ALUMNA = { idUsuario: 40, esPropietaria: false };
    const PROPIA = { id_alumno: 4, nombre: "Valentina", apellido: "Herrera", estado: "ACTIVO", propio: true };
    const MENOR = { id_alumno: 6, nombre: "Mateo", apellido: "Romero", estado: "ACTIVO", propio: false };
    // Lunes 12/10/2026 a las 10:00 de Argentina.
    const AHORA = new Date("2026-10-12T13:00:00Z");
    const LUNES_A_LAS_18 = {
      fecha_desde: new Date("2026-09-01T00:00:00Z"),
      fecha_hasta: null,
      horario: {
        id_horario: 31,
        dia_semana: 1,
        hora_inicio: new Date("1970-01-01T18:00:00Z"),
        hora_fin: new Date("1970-01-01T19:00:00Z"),
        cupo_maximo: null,
        fecha_baja: null,
        actividad: { nombre: "Funcional", cupo_maximo: 12 },
        profesora: { usuario: { nombre: "Lucía", apellido: "Gómez" } },
      },
    };
    const INSCRIPCION = {
      id_inscripcion: 9,
      estado: "ACTIVA",
      plan: { nombre: "Intermedio", tipo: "MENSUAL", clases_por_semana: 2 },
      profesora: { usuario: { nombre: "Lucía", apellido: "Gómez" } },
      horarios: [LUNES_A_LAS_18],
    };

    it("sin id arma el panel del alumno de quien pide, con su plan, sus próximas clases y su historial", async () => {
      mocks.alumnos.listarConsultables.mockResolvedValue([MENOR, PROPIA]);
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([INSCRIPCION]);
      mocks.inscripciones.contarLugaresOcupados.mockResolvedValue(new Map([[31, 5]]));
      mocks.asistencias.historialDelAlumno.mockResolvedValue({
        datos: [
          {
            id_clase: 7,
            fecha_clase: new Date("2026-10-05T00:00:00Z"),
            hora_inicio: new Date("1970-01-01T18:00:00Z"),
            hora_fin: new Date("1970-01-01T19:00:00Z"),
            actividad: "Funcional",
            profesora: { nombre: "Carla", apellido: "Ruiz" },
            asistio: true,
            observaciones: null,
          },
        ],
        total: 1,
        presentes: 1,
        ausentes: 0,
      });

      const panel = await servicio.obtenerPanelAlumno(ALUMNA, undefined, AHORA);

      expect(mocks.alumnos.listarConsultables).toHaveBeenCalledWith(40);
      expect(mocks.asistencias.historialDelAlumno).toHaveBeenCalledWith(4, { limit: 20, offset: 0 });
      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([9]);
      expect(panel).toMatchObject({
        id_alumno: 4,
        alumno: { nombre: "Valentina", apellido: "Herrera" },
        plan: { nombre: "Intermedio", profesora: "Lucía Gómez", estado_cuota: HABILITACION.estado },
        historial_asistencias: [
          { id_clase: 7, fecha: "2026-10-05", profesora: "Carla Ruiz", estado: "PRESENTE" },
        ],
      });
      expect(panel.planes).toEqual([panel.plan]);
      expect(panel.proximas_clases[0]).toEqual({
        id_horario: 31,
        id_inscripcion: 9,
        fecha: "2026-10-12",
        hora_inicio: "18:00",
        hora_fin: "19:00",
        actividad: "Funcional",
        profesora: "Lucía Gómez",
        cupo_disponible: 7,
      });
    });

    it("el tutor ve el panel del menor que elige; sin id, el de su primer menor", async () => {
      mocks.alumnos.listarConsultables.mockResolvedValue([MENOR]);
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);

      await expect(servicio.obtenerPanelAlumno(ALUMNA, 6, AHORA)).resolves.toMatchObject({ id_alumno: 6 });
      await expect(servicio.obtenerPanelAlumno(ALUMNA, undefined, AHORA)).resolves.toMatchObject({
        id_alumno: 6,
      });
    });

    it("un alumno ajeno responde 404, como uno que no existe, sin consultar sus datos", async () => {
      mocks.alumnos.listarConsultables.mockResolvedValue([PROPIA]);

      await expect(servicio.obtenerPanelAlumno(ALUMNA, 99, AHORA)).rejects.toBeInstanceOf(NotFoundError);
      mocks.alumnos.listarConsultables.mockResolvedValue([]);
      await expect(servicio.obtenerPanelAlumno(ALUMNA, undefined, AHORA)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(mocks.inscripciones.listarVigentesDeAlumno).not.toHaveBeenCalled();
      expect(mocks.asistencias.historialDelAlumno).not.toHaveBeenCalled();
    });

    it("sin inscripción vigente no hay plan ni próximas clases, y no se consulta la cuota", async () => {
      mocks.alumnos.listarConsultables.mockResolvedValue([PROPIA]);
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);

      await expect(servicio.obtenerPanelAlumno(ALUMNA, undefined, AHORA)).resolves.toMatchObject({
        plan: null,
        planes: [],
        proximas_clases: [],
      });
      expect(mocks.cuotas.habilitacionDeInscripciones).not.toHaveBeenCalled();
    });

    it("trae todos los planes vigentes y como principal usa la activa más nueva antes que una pre-inscripción", async () => {
      mocks.alumnos.listarConsultables.mockResolvedValue([PROPIA]);
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([
        {
          ...INSCRIPCION,
          id_inscripcion: 12,
          estado: "PREINSCRIPTA",
          plan: { ...INSCRIPCION.plan, nombre: "Nuevo" },
        },
        INSCRIPCION,
      ]);

      mocks.cuotas.habilitacionDeInscripciones.mockResolvedValue(
        new Map([
          [12, HABILITACION],
          [9, HABILITACION],
        ]),
      );

      const panel = await servicio.obtenerPanelAlumno(ALUMNA, undefined, AHORA);

      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([12, 9]);
      expect(panel.plan).toMatchObject({ id_inscripcion: 9, nombre: "Intermedio" });
      expect(panel.planes.map(({ id_inscripcion, nombre }) => ({ id_inscripcion, nombre }))).toEqual([
        { id_inscripcion: 12, nombre: "Nuevo" },
        { id_inscripcion: 9, nombre: "Intermedio" },
      ]);
    });

    it("sin fecha usa el momento actual", async () => {
      mocks.alumnos.listarConsultables.mockResolvedValue([PROPIA]);
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([]);

      await expect(servicio.obtenerPanelAlumno(ALUMNA)).resolves.toMatchObject({ id_alumno: 4 });
    });
  });
});
