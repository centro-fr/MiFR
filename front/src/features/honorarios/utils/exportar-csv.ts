import type { InformeHonorarios, LiquidacionDetalle, LineaAlumno, LineaSuplencia } from "@/types/honorarios";
import { etiquetaPeriodo } from "@/features/honorarios/utils/periodo";
import {
  ETIQUETA_ESTADO,
  describirTarifa,
  fechaCorta,
  nombreCompleto,
} from "@/features/honorarios/utils/formato-honorarios";

// Planilla del informe (US-23): CSV que abre Excel sin sumar una librería. Excel en español usa
// ";" para separar columnas y "," para los decimales.

const SEPARADOR = ";";
const FIN_DE_LINEA = "\r\n";
// Sin la marca BOM, Excel lee el archivo como Latin-1 y rompe las tildes.
const BOM = "﻿";

type Celda = string | number;

// Inyección de fórmulas (OWASP "CSV Injection"): un nombre que empieza con =, +, -, @ o un tab se
// ejecutaría como fórmula al abrirlo. Se antepone un apóstrofo para que quede como texto.
function texto(valor: string): string {
  const neutralizado = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${neutralizado.replace(/"/g, '""')}"`;
}

function numero(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

function fila(celdas: Celda[]): string {
  return celdas.map((celda) => (typeof celda === "number" ? numero(celda) : texto(celda))).join(SEPARADOR);
}

const ENCABEZADO = ["Período", "Profesora", "Estado", "Concepto", "Detalle", "Plan", "Situación", "Tarifa", "Monto"];

function situacion(linea: LineaAlumno): string {
  return linea.estadoInscripcion === "BAJA" && linea.fechaBaja ? `Baja el ${fechaCorta(linea.fechaBaja)}` : "Activa";
}

function detalleDeSuplencia({ concepto, clase }: LineaSuplencia): string {
  const cuando = `${clase.actividad} ${fechaCorta(clase.fecha)} ${clase.horaInicio}-${clase.horaFin}`;
  return concepto === "CLASE_SUPLIDA"
    ? `${cuando} (cubrió a ${nombreCompleto(clase.ausente)})`
    : `${cuando} (la cubrió ${nombreCompleto(clase.suplente)})`;
}

function filasDeLaProfesora(periodo: string, detalle: LiquidacionDetalle): Celda[][] {
  const base = [periodo, nombreCompleto(detalle.profesora), ETIQUETA_ESTADO[detalle.estado]];
  const filas: Celda[][] = [
    ...detalle.alumnos.map((linea) => [
      ...base,
      "Alumno a cargo",
      `${linea.alumno.apellido}, ${linea.alumno.nombre}`,
      linea.plan,
      situacion(linea),
      describirTarifa(linea.tarifa, "ALUMNO_A_CARGO"),
      linea.monto,
    ]),
    ...detalle.suplencias.map((linea) => [
      ...base,
      linea.concepto === "CLASE_SUPLIDA" ? "Clase suplida" : "Ausencia cubierta",
      detalleDeSuplencia(linea),
      "",
      "",
      describirTarifa(linea.tarifa, "HORA_SUPLENCIA"),
      linea.monto,
    ]),
  ];
  if (filas.length === 0) filas.push([...base, "Sin alumnos ni suplencias", "", "", "", "", 0]);
  filas.push([...base, "Total de la profesora", "", "", "", "", detalle.montoTotal]);
  return filas;
}

export function armarCsvHonorarios(informe: InformeHonorarios, detalles: LiquidacionDetalle[]): string {
  const periodo = etiquetaPeriodo(informe.periodo);
  const filas: Celda[][] = [
    ENCABEZADO,
    ...detalles.flatMap((detalle) => filasDeLaProfesora(periodo, detalle)),
    [periodo, "", "", "Total general", "", "", "", "", informe.totalGeneral],
  ];
  return BOM + filas.map(fila).join(FIN_DE_LINEA);
}

export function nombreArchivoHonorarios(periodo: string): string {
  return `honorarios-${periodo}.csv`;
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
