import type { InformeHonorarios, LiquidacionDetalle, LineaSuplencia } from "@/types/honorarios";
import { etiquetaPeriodo } from "@/features/honorarios/utils/periodo";
import {
  ETIQUETA_ESTADO,
  describirTarifa,
  fechaCorta,
  nombreCompleto,
  quienDeLaSuplencia,
  situacionDeLaLinea,
} from "@/features/honorarios/utils/formato-honorarios";
import { celdaDeNumero, celdaDeTexto, documentoCsv } from "@/utils/csv";

// Planilla del informe (US-23): CSV que abre Excel. Los montos van con dos decimales.

type Celda = string | number;

function fila(celdas: Celda[]) {
  return celdas.map((celda) => (typeof celda === "number" ? celdaDeNumero(celda, 2) : celdaDeTexto(celda)));
}

const ENCABEZADO = ["Período", "Profesora", "Estado", "Concepto", "Detalle", "Plan", "Situación", "Tarifa", "Monto"];

function detalleDeSuplencia(linea: LineaSuplencia): string {
  const { clase } = linea;
  return `${clase.actividad} ${fechaCorta(clase.fecha)} ${clase.horaInicio}-${clase.horaFin} (${quienDeLaSuplencia(linea)})`;
}

function filasDeLaProfesora(periodo: string, detalle: LiquidacionDetalle): Celda[][] {
  const base = [periodo, nombreCompleto(detalle.profesora), ETIQUETA_ESTADO[detalle.estado]];
  const filas: Celda[][] = [
    ...detalle.alumnos.map((linea) => [
      ...base,
      "Alumno a cargo",
      `${linea.alumno.apellido}, ${linea.alumno.nombre}`,
      linea.inscripcion?.plan ?? "—",
      situacionDeLaLinea(linea),
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
  return documentoCsv(filas.map(fila));
}

export function nombreArchivoHonorarios(periodo: string): string {
  return `honorarios-${periodo}.csv`;
}
