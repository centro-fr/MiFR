// Planillas CSV que abre Excel sin sumar una librería (informes de honorarios y de asistencia). Excel
// en español usa ";" para separar columnas y "," para los decimales.

const SEPARADOR = ";";
const FIN_DE_LINEA = "\r\n";
// Sin la marca BOM, Excel lee el archivo como Latin-1 y rompe las tildes.
const BOM = "﻿";

/** Una celda ya escrita: armarla con celdaDeTexto o celdaDeNumero. */
export type CeldaCsv = string & { readonly __celdaCsv: unique symbol };

// Inyección de fórmulas (OWASP "CSV Injection"): un nombre que empieza con =, +, -, @ o un tab se
// ejecutaría como fórmula al abrirlo. Se antepone un apóstrofo para que quede como texto.
export function celdaDeTexto(valor: string): CeldaCsv {
  const neutralizado = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${neutralizado.replace(/"/g, '""')}"` as CeldaCsv;
}

export function celdaDeNumero(valor: number, decimales: number): CeldaCsv {
  return valor.toFixed(decimales).replace(".", ",") as CeldaCsv;
}

export function documentoCsv(filas: CeldaCsv[][]): string {
  return BOM + filas.map((celdas) => celdas.join(SEPARADOR)).join(FIN_DE_LINEA);
}

export function descargarCsv(contenido: string, nombreArchivo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  // Se libera después del click: si se revoca antes, algunos navegadores cancelan la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
