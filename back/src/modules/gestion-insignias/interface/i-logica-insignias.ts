import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { FichaInsignias, FiltroRanking, RankingAsistencia } from "../insignia/insignia.types.js";

// La parte de ILogicaInsignias que usa el controller de Insignia. No es una interfaz nueva del
// diagrama: la que provee el subsistema es la unión.
export interface ILogicaInsigniasDeAlumnos {
  obtenerFichaInsignias(idAlumno: number, solicitante: Solicitante): Promise<FichaInsignias>;
  consultarRankingAsistencia(filtro: FiltroRanking, solicitante: Solicitante): Promise<RankingAsistencia>;
}

// Interfaz del subsistema GestionInsignias en la vista arquitectónica: la consume InsigniasPresWeb.
// El cierre mensual no está acá: lo corre el proceso CierreMensualInsignias, no la API.
export interface ILogicaInsignias extends ILogicaInsigniasDeAlumnos {}
