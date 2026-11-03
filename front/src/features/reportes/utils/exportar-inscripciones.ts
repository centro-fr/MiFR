import { acumulados, mesesTranscurridos, promedioMensual } from "@/features/reportes/utils/formato-inscripciones";
import type { EstadisticasInscripciones } from "@/types/reportes";
import { celdaDeNumero, celdaDeTexto, documentoCsv, type CeldaCsv } from "@/utils/csv";

// Planilla de inscriptos por mes (US-35): encabezado con el año y los filtros, una fila por mes que
// ya empezó y el total del año al pie.

/** Plan y profesora elegidos, por nombre; null es "todos". */
export interface FiltrosInscripcionesDescritos {
  plan: string | null;
  profesora: string | null;
}

export function describirFiltrosInscripciones({ plan, profesora }: FiltrosInscripcionesDescritos): string[] {
  return [plan && `Plan: ${plan}`, profesora && `Profesora: ${profesora}`].filter((texto): texto is string => Boolean(texto));
}

const texto = celdaDeTexto;
const entero = (valor: number) => celdaDeNumero(valor, 0);
// La comparación va como números y no como "+3 (+27 %)": un texto que empieza con "+" se trata como
// posible fórmula (ver celdaDeTexto), y así además se puede ordenar y sumar en Excel.
const vacia = "" as CeldaCsv;
const numeroOVacia = (valor: number | null, decimales: number) => (valor === null ? vacia : celdaDeNumero(valor, decimales));

export function armarCsvInscripciones(estadisticas: EstadisticasInscripciones, descripcion: FiltrosInscripcionesDescritos, hoy: string): string {
  const meses = mesesTranscurridos(estadisticas.meses, hoy);
  const acumulado = acumulados(meses);
  const filas: CeldaCsv[][] = [
    [texto("Inscriptos por mes"), texto(String(estadisticas.anio))],
    [texto("Filtros"), texto(describirFiltrosInscripciones(descripcion).join(" · ") || "Todos los planes y profesoras")],
    [],
    [texto("Mes"), texto("Altas"), texto("Diferencia con el mes anterior"), texto("Variación %"), texto("Acumulado del año")],
    ...meses.map((mes, indice) => [
      texto(`${mes.nombre} ${mes.anio}`),
      entero(mes.cantidad),
      numeroOVacia(mes.diferencia, 0),
      numeroOVacia(mes.variacion, 1),
      entero(acumulado[indice]),
    ]),
    [],
    [texto("Total del año"), entero(estadisticas.totalAltas)],
    [texto("Promedio por mes"), celdaDeNumero(promedioMensual(meses), 1)],
  ];
  return documentoCsv(filas);
}

export function nombreArchivoInscripciones(anio: number): string {
  return `inscriptos-por-mes-${anio}.csv`;
}
