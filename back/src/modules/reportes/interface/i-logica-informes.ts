import type { SeguimientoInactividad } from "../../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type {
  FiltroAlumnosInactivos,
  PaginaAlumnosInactivos,
} from "../detector-inactividad/detector-inactividad.types.js";
import type { RegistrarSeguimientoInput } from "../detector-inactividad/detector-inactividad.schemas.js";

// La parte de ILogicaInformes que usa el controller de DetectorInactividad (US-22). No es una interfaz
// nueva del diagrama: la que provee el subsistema es la unión.
export interface ILogicaAlumnosInactivos {
  listarAlumnosInactivos(filtro: FiltroAlumnosInactivos): Promise<PaginaAlumnosInactivos>;
  registrarSeguimientoInactividad(
    idInscripcion: number,
    input: RegistrarSeguimientoInput,
    idUsuario: number,
  ): Promise<SeguimientoInactividad>;
  quitarSeguimientoInactividad(idInscripcion: number): Promise<void>;
}

// Interfaz del subsistema Reportes en la vista arquitectónica: lo que consume la presentación
// (InformesPresWeb). Por ahora solo la detección de inactivos; GeneradorInformes sumará su parte.
export interface ILogicaInformes extends ILogicaAlumnosInactivos {}
