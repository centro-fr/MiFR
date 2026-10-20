import type {
  CriterioDeLogro,
  FilaParaRanking,
  MarcaDeHistorial,
  ProximoHito,
  ResumenRacha,
} from "../calculador-racha-ranking.types.js";

// Interfaz provista por CalculadorRachaRanking (Calculos del negocio) en la vista arquitectónica. La
// usa Insignia para la racha y las insignias (US-31) y el ranking de asistencia (US-30). Las marcas
// llegan en orden cronológico y solo de clases dictadas: elegir cuáles cuentan es de quien consulta.
export interface ICalculoRachaRanking {
  resumirRacha(marcas: MarcaDeHistorial[]): ResumenRacha;
  // El inicio de la clase en que se llegó por primera vez al umbral; null si no se llegó.
  cuandoSeAlcanzo(marcas: MarcaDeHistorial[], criterio: CriterioDeLogro, umbral: number): Date | null;
  // Con dos decimales; 0 si no hubo clases previstas.
  porcentaje(asistidas: number, previstas: number): number;
  // Porcentaje descendente, clases asistidas descendente, y apellido y nombre ascendentes (US-30).
  ordenarRanking<T extends FilaParaRanking>(filas: T[]): (T & { posicion: number })[];
  // El umbral más chico que todavía no se alcanzó; null si ya se alcanzaron todos.
  proximoHito(actual: number, umbrales: number[]): ProximoHito | null;
}
