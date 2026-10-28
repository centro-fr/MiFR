import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { ActualizarProgresoInput, RegistrarProgresoInput } from "../progreso/progreso.schemas.js";
import type { RegistroDeProgreso } from "../progreso/progreso.types.js";
import type { CrearRutinaInput } from "../rutina/rutina.schemas.js";
import type { Rutina } from "../rutina/rutina.types.js";

// Las partes de ILogicaRutinasYProgreso que usan los controllers de Rutina y de Progreso. La interfaz que
// provee el subsistema es la unión.
export interface ILogicaRutinas {
  crearRutina(input: CrearRutinaInput, solicitante: Solicitante): Promise<Rutina>;
  listarRutinasDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<Rutina[]>;
  // null: el alumno todav��a no tiene rutina.
  obtenerRutinaVigente(idAlumno: number, solicitante: Solicitante): Promise<Rutina | null>;
  obtenerMiRutina(solicitante: Solicitante): Promise<Rutina | null>;
  listarMiRutinas(solicitante: Solicitante): Promise<Rutina[]>;
}

export interface ILogicaProgreso {
  registrarProgreso(input: RegistrarProgresoInput, solicitante: Solicitante): Promise<RegistroDeProgreso>;
  listarProgresoDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<RegistroDeProgreso[]>;
  actualizarProgreso(
    idRegistro: number,
    input: ActualizarProgresoInput,
    solicitante: Solicitante,
  ): Promise<RegistroDeProgreso>;
  eliminarProgreso(idRegistro: number, solicitante: Solicitante): Promise<void>;
  listarMiProgreso(solicitante: Solicitante): Promise<RegistroDeProgreso[]>;
}

// Interfaz del subsistema GestionRutinasYProgreso en la vista arquitect��nica (US-27 y US-28).
export interface ILogicaRutinasYProgreso extends ILogicaRutinas, ILogicaProgreso {}
