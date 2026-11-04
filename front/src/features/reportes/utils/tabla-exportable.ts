import { celdaDeNumero, celdaDeTexto, documentoCsv, type CeldaCsv } from "@/utils/csv";

// Lo que se exporta de un informe (planilla y PDF), armado una sola vez por cada pestaña.

export interface ColumnaExportable {
  titulo: string;
  /** Con decimales: se escribe como número en la planilla, para que Excel pueda sumarlo. */
  decimales?: number;
}

export type CeldaExportable = string | number;

export interface TablaExportable {
  titulo: string;
  /** Período y filtros, como los lee una persona. */
  detalle: string;
  resumen: [string, string][];
  columnas: ColumnaExportable[];
  filas: CeldaExportable[][];
  pie?: string;
  /** Sin extensión: "cobranza-2026-10". */
  nombreArchivo: string;
}

export function armarCsv(tabla: TablaExportable): { contenido: string; nombreArchivo: string } {
  const celda = (valor: CeldaExportable, columna: ColumnaExportable): CeldaCsv =>
    typeof valor === "number" ? celdaDeNumero(valor, columna.decimales ?? 0) : celdaDeTexto(valor);
  const filas: CeldaCsv[][] = [
    [celdaDeTexto(tabla.titulo)],
    [celdaDeTexto(tabla.detalle)],
    [],
    ...tabla.resumen.map(([etiqueta, valor]) => [celdaDeTexto(etiqueta), celdaDeTexto(valor)]),
    [],
    tabla.columnas.map((columna) => celdaDeTexto(columna.titulo)),
    ...tabla.filas.map((fila) => fila.map((valor, indice) => celda(valor, tabla.columnas[indice] ?? { titulo: "" }))),
  ];
  return { contenido: documentoCsv(filas), nombreArchivo: `${tabla.nombreArchivo}.csv` };
}
