import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type {
  InscripcionConDatos,
  ResumenInscripcionAlumno,
} from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { ActualizarAlumnoInput, CrearAlumnoInput, ListarAlumnoQuery } from "../alumno/alumno.schemas.js";
import type { Alumno, PaginaAlumnos } from "../alumno/alumno.types.js";
import type { CrearProfesoraInput } from "../profesor/profesor.schemas.js";
import type { Profesora } from "../profesor/profesor.types.js";

// Las partes de ILogicaPersonas, una por componente: cada controller depende solo de la suya.
// No son interfaces nuevas del diagrama; la que provee el subsistema es la unión.

export interface ILogicaProfesoras {
  crearProfesora(input: CrearProfesoraInput): Promise<Profesora>;
  listarProfesoras(): Promise<Profesora[]>;
  darDeBajaProfesora(id: number): Promise<Profesora>;
}

// US-10: cada fila del listado trae su plan y profesora vigentes, y la ficha sus inscripciones
// vigentes con los horarios. Los dos salen de Inscripcion, en el otro subsistema.
export type AlumnoEnListado = Alumno & { inscripcion: ResumenInscripcionAlumno | null };
export type PaginaListadoAlumnos = Omit<PaginaAlumnos, "datos"> & { datos: AlumnoEnListado[] };
export type FichaAlumno = Alumno & { inscripciones: InscripcionConDatos[] };
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
}

// Interfaz del subsistema GestionPersonas para las operaciones expuestas a la API.
export interface ILogicaPersonas extends ILogicaProfesoras, ILogicaAlumnos {}
