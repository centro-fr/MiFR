import type {
  CriterioDeLogro,
  FilaParaRanking,
  MarcaDeHistorial,
  ProximoHito,
  ResumenRacha,
} from "./calculador-racha-ranking.types.js";
import type { ICalculoRachaRanking } from "./interface/i-calculo-racha-ranking.js";

const compararTexto = new Intl.Collator("es", { sensitivity: "base" }).compare;

// Cálculo puro: no lee la base ni la hora del servidor. La racha cuenta clases seguidas sin faltar
// y no se reinicia con el mes (US-31): una inasistencia la lleva a 0.
export class CalculadorRachaRanking implements ICalculoRachaRanking {
  resumirRacha(marcas: MarcaDeHistorial[]): ResumenRacha {
    let actual = 0;
    let mejor = 0;
    let inicioActual: Date | null = null;
    let asistidas = 0;
    for (const { asistio, inicio } of marcas) {
      if (!asistio) {
        actual = 0;
        inicioActual = null;
        continue;
      }
      if (actual === 0) inicioActual = inicio;
      actual += 1;
      asistidas += 1;
      mejor = Math.max(mejor, actual);
    }
    return { actual, mejor, inicio_actual: inicioActual, clases_asistidas: asistidas };
  }

  cuandoSeAlcanzo(marcas: MarcaDeHistorial[], criterio: CriterioDeLogro, umbral: number): Date | null {
    let racha = 0;
    let total = 0;
    for (const { asistio, inicio } of marcas) {
      racha = asistio ? racha + 1 : 0;
      if (asistio) total += 1;
      if ((criterio === "RACHA" ? racha : total) >= umbral) return inicio;
    }
    return null;
  }

  porcentaje(asistidas: number, previstas: number): number {
    if (previstas === 0) return 0;
    return Math.round((asistidas / previstas) * 10_000) / 100;
  }

  ordenarRanking<T extends FilaParaRanking>(filas: T[]): (T & { posicion: number })[] {
    return [...filas]
      .sort(
        (a, b) =>
          b.porcentaje_asistencia - a.porcentaje_asistencia ||
          b.clases_asistidas - a.clases_asistidas ||
          compararTexto(a.apellido, b.apellido) ||
          compararTexto(a.nombre, b.nombre) ||
          a.id_alumno - b.id_alumno,
      )
      .map((fila, indice) => ({ ...fila, posicion: indice + 1 }));
  }

  proximoHito(actual: number, umbrales: number[]): ProximoHito | null {
    const pendientes = umbrales.filter((umbral) => umbral > actual);
    if (pendientes.length === 0) return null;
    const umbral = Math.min(...pendientes);
    return { umbral, faltantes: umbral - actual };
  }
}
