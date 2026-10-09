import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
  ReactivarAlumnoInput,
} from "../inscripcion/inscripcion.schemas.js";
import type { IInfoInscripciones } from "../inscripcion/interface/i-info-inscripciones.js";
import type { FiltroInscripciones, InscripcionConDatos } from "../inscripcion/inscripcion.types.js";

// La parte de ILogicaInscripcionesYClases que usa el controller de Inscripcion. No es una
// interfaz nueva del diagrama: cuando exista el componente Clase, sumará la suya.
export interface ILogicaInscripciones {
  crearInscripcion(input: CrearInscripcionInput): Promise<InscripcionConDatos>;
  listarInscripciones(filtro: FiltroInscripciones): Promise<InscripcionConDatos[]>;
  obtenerInscripcion(id: number): Promise<InscripcionConDatos>;
  activarInscripcion(id: number): Promise<InscripcionConDatos>;
  darDeBajaAlumno(idAlumno: number, input: DarDeBajaAlumnoInput): Promise<void>;
  reactivarAlumno(idAlumno: number, input: ReactivarAlumnoInput): Promise<InscripcionConDatos>;
  cambiarPlan(id: number, input: CambiarPlanInput): Promise<InscripcionConDatos>;
  actualizarHorarios(id: number, input: ActualizarHorariosInput): Promise<InscripcionConDatos>;
}

// Interfaz del subsistema GestionInscripcionesYClases en la vista arquitectónica: reúne las
// operaciones del componente Inscripcion que consume la presentación; clases queda afuera.
export interface ILogicaInscripcionesYClases extends ILogicaInscripciones, IInfoInscripciones {}
