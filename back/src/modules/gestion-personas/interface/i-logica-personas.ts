import type { ActualizarAlumnoInput, CrearAlumnoInput } from "../alumno/alumno.schemas.js";
import type { Alumno, FiltroAlumno, PaginaAlumnos } from "../alumno/alumno.types.js";
import type { CrearProfesoraInput } from "../profesor/profesor.schemas.js";
import type { Profesora } from "../profesor/profesor.types.js";

// Interfaz del subsistema GestionPersonas para las operaciones expuestas a la API.
export interface ILogicaPersonas {
  crearProfesora(input: CrearProfesoraInput): Promise<Profesora>;
  listarProfesoras(): Promise<Profesora[]>;
  darDeBajaProfesora(id: number): Promise<Profesora>;
  crearAlumno(input: CrearAlumnoInput): Promise<Alumno>;
  listarAlumnos(filtro: FiltroAlumno): Promise<PaginaAlumnos>;
  obtenerAlumnoPorId(id: number): Promise<Alumno>;
  actualizarAlumno(id: number, input: ActualizarAlumnoInput): Promise<Alumno>;
}
