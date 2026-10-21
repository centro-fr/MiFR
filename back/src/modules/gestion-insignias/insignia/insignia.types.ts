import type { alumno_insignias, insignias, tipo_insignia } from "@prisma/client";
import type { ProximoHito } from "../../calculos-del-negocio/calculador-racha-ranking/calculador-racha-ranking.types.js";

export type TipoInsignia = tipo_insignia;
export type Insignia = insignias;
export type InsigniaObtenida = alumno_insignias & { insignia: Insignia };

// periodo: AAAA-MM para las mensuales (MES_PERFECTO, PODIO_MES) y "" para las que se obtienen una
// sola vez, así la clave primaria no deja repetir una ni impide la misma mensual en otro mes.
export interface InsigniaAOtorgar {
  id_alumno: number;
  id_insignia: number;
  periodo: string;
  fecha_obtencion: Date;
}

export type InsigniaResumida = Pick<Insignia, "codigo" | "nombre" | "descripcion" | "tipo">;

export interface ProgresoInsignia {
  actual: number;
  umbral: number;
}

export interface InsigniaDeFicha extends InsigniaResumida {
  valor_umbral: number;
  obtenida: boolean;
  // La primera vez que la obtuvo; las mensuales pueden repetirse, y periodos dice en qué meses.
  fecha_obtencion: Date | null;
  periodos: string[];
  // Solo para racha y total de clases: las mensuales no tienen un avance que mostrar durante el mes.
  progreso: ProgresoInsignia | null;
}

export interface FichaInsignias {
  id_alumno: number;
  racha: {
    actual: number;
    mejor: number;
    fecha_inicio: Date | null;
    proximo_hito: ProximoHito | null;
  };
  clases_asistidas: number;
  proximo_hito_clases: ProximoHito | null;
  insignias: InsigniaDeFicha[];
}

export interface FiltroRanking {
  desde?: Date;
  hasta?: Date;
  actividad?: number;
  limit: number;
  offset: number;
}

export interface FilaRanking {
  posicion: number;
  id_alumno: number;
  nombre: string;
  apellido: string;
  clases_previstas: number;
  clases_asistidas: number;
  porcentaje_asistencia: number;
  racha_actual: number;
  insignias: InsigniaResumida[];
  // La fila del alumno que consulta o de un menor a su cargo: el front la destaca (US-30).
  es_propia: boolean;
}

export interface RankingAsistencia {
  periodo: { desde: Date; hasta: Date };
  actividad: number | null;
  minimo_clases: number;
  datos: FilaRanking[];
  // Las filas propias aunque estén fuera de la página, para mostrar siempre "mi posición".
  propias: FilaRanking[];
  total: number;
  limit: number;
  offset: number;
}

export interface ResumenCierreMensual {
  periodo: string;
  mes_perfecto: number;
  podio: number;
}
