import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError } from "../../../shared/errors/app-error.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { AlumnoService } from "../alumno/alumno.service.js";
import type { ListarAlumnoQuery } from "../alumno/alumno.schemas.js";
import type { ProfesorService } from "../profesor/profesor.service.js";
import { GestionPersonasService } from "../gestion-personas.service.js";

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

function crearMocks() {
  return {
    profesoras: {
      crear: vi.fn(),
      listar: vi.fn(),
      darDeBaja: vi.fn(),
      buscarPorUsuario: vi.fn().mockResolvedValue({ id_profesora: ID_PROFESORA }),
    },
    horarios: {
      buscarPorIds: vi.fn(),
      tieneActivosDeProfesora: vi.fn().mockResolvedValue(false),
    },
    alumnos: {
      crear: vi.fn(),
      listar: vi.fn(async ({ limit, offset }) => ({ datos: [{ id_alumno: 4 }], total: 1, limit, offset })),
      obtenerPorId: vi.fn().mockResolvedValue({ id_alumno: 4 }),
      actualizar: vi.fn().mockResolvedValue({ id_alumno: 4 }),
    },
    inscripciones: {
      obtenerIdsDeAlumnos: vi.fn().mockResolvedValue([4]),
      resumirInscripcionesVigentes: vi
        .fn()
        .mockResolvedValue([{ id_alumno: 4, id_inscripcion: 9, nombre_plan: "Básico" }]),
      listarVigentesDeAlumno: vi.fn().mockResolvedValue([{ id_inscripcion: 9, id_profesora: ID_PROFESORA }]),
      listarDeLaUltimaBaja: vi.fn().mockResolvedValue([{ id_inscripcion: 8, id_profesora: ID_PROFESORA }]),
    },
    cuotas: {
      habilitacionDeInscripciones: vi.fn().mockResolvedValue(
        new Map([
          [8, HABILITACION],
          [9, HABILITACION],
        ]),
      ),
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
      mocks.horarios as IInfoHorarios,
      mocks.alumnos as unknown as AlumnoService,
      mocks.inscripciones as unknown as IInfoInscripciones,
      mocks.cuotas as unknown as IInfoCuotas,
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
        },
      ]);
      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([9]);
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

      expect(pagina.datos).toEqual([{ id_alumno: 4, inscripcion: null, situacion_cuota: null }]);
    });
  });

  describe("obtenerAlumnoPorId", () => {
    it("devuelve la ficha con las inscripciones vigentes y su situación de cuota", async () => {
      await expect(servicio.obtenerAlumnoPorId(4, PROPIETARIA)).resolves.toEqual({
        id_alumno: 4,
        inscripciones: [{ id_inscripcion: 9, id_profesora: ID_PROFESORA, situacion_cuota: SITUACION }],
        inscripciones_de_la_baja: [],
      });
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
          { id_inscripcion: 8, id_profesora: ID_PROFESORA, situacion_cuota: SITUACION },
        ],
      });
      expect(mocks.inscripciones.listarDeLaUltimaBaja).toHaveBeenCalledWith(4);
      expect(mocks.cuotas.habilitacionDeInscripciones).toHaveBeenCalledWith([8]);
    });

    it("la profesora ve la ficha de un alumno a su cargo", async () => {
      await expect(servicio.obtenerAlumnoPorId(4, PROFESORA)).resolves.toMatchObject({ id_alumno: 4 });
    });

    it("la profesora no ve la ficha de un alumno que no tiene a cargo", async () => {
      mocks.inscripciones.listarVigentesDeAlumno.mockResolvedValue([{ id_inscripcion: 9, id_profesora: 99 }]);

      await expect(servicio.obtenerAlumnoPorId(4, PROFESORA)).rejects.toThrow(ForbiddenError);
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

    it("no deja que una profesora elija como tutor una cuenta existente por su id", async () => {
      await expect(
        servicio.crearAlumno({ nombre: "Ana", tutor: { id_usuario: 1 } } as never, PROFESORA),
      ).rejects.toThrow(ForbiddenError);
      expect(mocks.alumnos.crear).not.toHaveBeenCalled();
    });

    it("la propietaria sí elige una cuenta existente como tutor", async () => {
      mocks.alumnos.crear.mockResolvedValue({ id_alumno: 4, responsable: tutor });

      await servicio.crearAlumno({ nombre: "Ana", tutor: { id_usuario: 20 } } as never, PROPIETARIA);

      expect(mocks.alumnos.crear).toHaveBeenCalled();
    });
  });
});
