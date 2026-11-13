import { motivosPrincipales } from "@/features/reportes/utils/comparacion-anios";
import { mesesTranscurridos } from "@/features/reportes/utils/formato-inscripciones";
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
// Los números van como números para poder ordenarlos y sumarlos en Excel; sin dato, la celda queda vacía.
const vacia = "" as CeldaCsv;
const numeroOVacia = (valor: number | null, decimales: number) => (valor === null ? vacia : celdaDeNumero(valor, decimales));

export function armarCsvInscripciones(estadisticas: EstadisticasInscripciones, descripcion: FiltrosInscripcionesDescritos, hoy: string): string {
  const meses = mesesTranscurridos(estadisticas.meses, hoy);
  const { permanencia } = estadisticas.bajas;
  const filas: CeldaCsv[][] = [
    [texto("Inscripciones"), texto(String(estadisticas.anio))],
    [texto("Filtros"), texto(describirFiltrosInscripciones(descripcion).join(" · ") || "Todos los planes y profesoras")],
    [],
    [texto("Mes"), texto("Altas"), texto("Bajas"), texto("Activos al cierre")],
    ...meses.map((mes) => [texto(`${mes.nombre} ${mes.anio}`), entero(mes.cantidad), entero(mes.bajas), numeroOVacia(mes.activosAlCierre, 0)]),
    [],
    [texto("Total"), entero(meses.reduce((t, m) => t + m.cantidad, 0)), entero(meses.reduce((t, m) => t + m.bajas, 0))],
    [],
    [texto("Motivo de baja"), texto("Cantidad")],
    ...motivosPrincipales(estadisticas.bajas.motivos).map(({ nombre, cantidad }) => [texto(nombre), entero(cantidad)]),
    [],
    [texto("Meses promedio que se quedan"), numeroOVacia(permanencia.promedioMeses, 1)],
    [texto("Se fueron en los primeros 3 meses"), entero(permanencia.primerosTresMeses)],
  ];
  return documentoCsv(filas);
}

export function nombreArchivoInscripciones(anio: number): string {
  return `inscripciones-${anio}.csv`;
}
