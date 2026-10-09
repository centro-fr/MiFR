import type { ActualizarAlumnoInput, CrearAlumnoInput } from "../alumno/alumno.schemas.js";
import type { Alumno, FiltroAlumno, PaginaAlumnos } from "../alumno/alumno.types.js";
import type { CrearProfesoraInput } from "../profesor/profesor.schemas.js";
import type { Profesora } from "../profesor/profesor.types.js";

// Las partes de ILogicaPersonas, una por componente: cada controller depende solo de la suya.
// No son interfaces nuevas del diagrama; la que provee el subsistema es la unión.

export interface ILogicaProfesoras {
  crearProfesora(input: CrearProfesoraInput): Promise<Profesora>;
  listarProfesoras(): Promise<Profesora[]>;
  darDeBajaProfesora(id: number): Promise<Profesora>;
}

export interface ILogicaAlumnos {
  crearAlumno(input: CrearAlumnoInput): Promise<Alumno>;
  listarAlumnos(filtro: FiltroAlumno): Promise<PaginaAlumnos>;
  obtenerAlumnoPorId(id: number): Promise<Alumno>;
  actualizarAlumno(id: number, input: ActualizarAlumnoInput): Promise<Alumno>;
}

// Interfaz del subsistema GestionPersonas para las operaciones expuestas a la API.
export interface ILogicaPersonas extends ILogicaProfesoras, ILogicaAlumnos {}
