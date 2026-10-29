import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { EstadoHabilitacion } from "../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";
import type { CuotaDelHistorial } from "../../gestion-cuotas-y-pagos/cuota/cuota.types.js";
import type {
  InscripcionConDatos,
  ResumenInscripcionAlumno,
} from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { ActualizarAlumnoInput, CrearAlumnoInput, ListarAlumnoQuery } from "../alumno/alumno.schemas.js";
import type { Alumno, AlumnoConsultable, PaginaAlumnos } from "../alumno/alumno.types.js";
import type { CrearProfesoraInput } from "../profesor/profesor.schemas.js";
import type { Profesora } from "../profesor/profesor.types.js";

// Las partes de ILogicaPersonas, una por componente: cada controller depende solo de la suya.
// No son interfaces nuevas del diagrama; la que provee el subsistema es la unión.

export interface ILogicaProfesoras {
  crearProfesora(input: CrearProfesoraInput): Promise<Profesora>;
  listarProfesoras(filtro?: { incluirBajas?: boolean }): Promise<Profesora[]>;
  darDeBajaProfesora(id: number): Promise<Profesora>;
}

// US-10 y US-18: si la inscripción está al día, por vencer o vencida. Sale de Cuota (IInfoCuotas) y
// no se guarda: se calcula en cada consulta.
export interface SituacionCuota {
  estado: EstadoHabilitacion;
  fecha_vencimiento: Date | null;
  dias_restantes: number | null;
  puede_asistir: boolean;
  tiene_pago_pendiente: boolean;
}
export type InscripcionConSituacion = InscripcionConDatos & { situacion_cuota: SituacionCuota | null };

// US-10: cada fila del listado trae su plan y profesora vigentes, y la ficha sus inscripciones
// vigentes con los horarios. Los dos salen de Inscripcion, en el otro subsistema; la situación de
// cuota, de Cuota. La ficha de un alumno dado de baja trae además las inscripciones de su última
// baja, con lo que debía al irse (US-08). El historial de cuotas y pagos es un dato financiero: solo
// lo ve la propietaria, y a una profesora le llega null.
export type AlumnoEnListado = Alumno & {
  inscripcion: ResumenInscripcionAlumno | null;
  situacion_cuota: SituacionCuota | null;
};
export type PaginaListadoAlumnos = Omit<PaginaAlumnos, "datos"> & { datos: AlumnoEnListado[] };
export type FichaAlumno = Alumno & {
  inscripciones: InscripcionConSituacion[];
  inscripciones_de_la_baja: InscripcionConSituacion[];
  historial_cuotas: CuotaDelHistorial[] | null;
};
// A una profesora el alta le devuelve del tutor solo su identificación (ver GestionPersonasService).
export type AlumnoDadoDeAlta = Omit<Alumno, "responsable"> & {
  responsable:
    Alumno["responsable"] | Pick<NonNullable<Alumno["responsable"]>, "id_usuario" | "nombre" | "apellido">;
};

export interface ILogicaAlumnos {
  crearAlumno(input: CrearAlumnoInput, solicitante: Solicitante): Promise<AlumnoDadoDeAlta>;
  listarAlumnos(consulta: ListarAlumnoQuery, solicitante: Solicitante): Promise<PaginaListadoAlumnos>;
  obtenerAlumnoPorId(id: number, solicitante: Solicitante): Promise<FichaAlumno>;
  actualizarAlumno(id: number, input: ActualizarAlumnoInput, solicitante: Solicitante): Promise<Alumno>;
  listarAlumnosConsultables(solicitante: Solicitante): Promise<AlumnoConsultable[]>;
}

// Interfaz del subsistema GestionPersonas para las operaciones expuestas a la API.
export interface ILogicaPersonas extends ILogicaProfesoras, ILogicaAlumnos {}
