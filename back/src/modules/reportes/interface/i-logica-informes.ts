import type { SeguimientoInactividad } from "../../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type {
  FiltroAlumnosInactivos,
  PaginaAlumnosInactivos,
} from "../detector-inactividad/detector-inactividad.types.js";
import type { RegistrarSeguimientoInput } from "../detector-inactividad/detector-inactividad.schemas.js";

import type {
  EstadisticasInscripciones,
  EstadisticasPlanes,
  FiltroCobranza,
  FiltroCuotasVencidas,
  FiltroInscripciones,
  FiltroPlanes,
  InformeCobranza,
  InformeCuotasVencidas,
} from "../generador-informes/generador-informes.types.js";

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

// La parte de ILogicaInformes que usa el controller de GeneradorInformes (US-34 a US-36 y cobranza).
export interface ILogicaGeneradorInformes {
  informeCuotasVencidas(filtro: FiltroCuotasVencidas): Promise<InformeCuotasVencidas>;
  informeCobranza(filtro: FiltroCobranza): Promise<InformeCobranza>;
  estadisticasPlanes(filtro: FiltroPlanes): Promise<EstadisticasPlanes>;
  estadisticasInscripciones(filtro: FiltroInscripciones): Promise<EstadisticasInscripciones>;
}

// Interfaz del subsistema Reportes en la vista arquitectónica: lo que consume la presentación
// (InformesPresWeb). Unión de las operaciones de DetectorInactividad y GeneradorInformes.
export interface ILogicaInformes extends ILogicaAlumnosInactivos, ILogicaGeneradorInformes {}
