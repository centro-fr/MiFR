import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { CrearRutinaInput } from "../rutina/rutina.schemas.js";
import type { Rutina } from "../rutina/rutina.types.js";

// La parte de ILogicaRutinasYProgreso que usa el controller de Rutina. La interfaz que provee el
// subsistema es la unión de las de sus componentes.
export interface ILogicaRutinas {
  crearRutina(input: CrearRutinaInput, solicitante: Solicitante): Promise<Rutina>;
  listarRutinasDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<Rutina[]>;
  // null: el alumno todavía no tiene rutina.
  obtenerRutinaVigente(idAlumno: number, solicitante: Solicitante): Promise<Rutina | null>;
}

// Interfaz del subsistema GestionRutinasYProgreso en la vista arquitectónica (US-27 y US-28).
export interface ILogicaRutinasYProgreso extends ILogicaRutinas {}