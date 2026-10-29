import { filtrosAplicados, periodoDelInforme, type FiltrosDescritos } from "@/features/reportes/utils/formato-informe";
import type { InformeAsistencia } from "@/types/reportes";
import { celdaDeNumero, celdaDeTexto, documentoCsv, type CeldaCsv } from "@/utils/csv";

// Planilla del informe de asistencia (US-33): un bloque por sección (resumen, profesoras y alumnos),
// separados por una fila vacía, como lo armaría alguien a mano en Excel.

type Celda = string | number;

function fila(celdas: Celda[]): CeldaCsv[] {
  // Las cantidades son enteras y los porcentajes llevan un decimal.
  return celdas.map((celda) =>
    typeof celda === "number" ? celdaDeNumero(celda, Number.isInteger(celda) ? 0 : 1) : celdaDeTexto(celda),
  );
}

function bloqueResumen(informe: InformeAsistencia, descripcion: FiltrosDescritos): Celda[][] {
  const { resumen } = informe;
  return [
    ["Informe de asistencia", periodoDelInforme(informe.desde, informe.hasta)],
    ["Filtros", filtrosAplicados(descripcion).join(" · ") || "Sin filtros"],
    [],
    ["Clases dictadas", "Asistencias", "Inasistencias", "% de asistencia"],
    [resumen.clasesDictadas, resumen.asistencias, resumen.inasistencias, resumen.porcentaje],
  ];
}

function bloqueProfesoras(informe: InformeAsistencia): Celda[][] {
  return [
    ["Profesora", "Clases dictadas", "Alumnos", "Asistencias", "% promedio"],
    ...informe.porProfesora.map((p) => [`${p.apellido}, ${p.nombre}`, p.clasesDictadas, p.cantidadAlumnos, p.asistencias, p.porcentajePromedio]),
  ];
}

function bloqueAlumnos(informe: InformeAsistencia): Celda[][] {
  return [
    ["Alumno", "Estado", "Clases previstas", "Asistencias", "Inasistencias", "% de asistencia"],
    ...informe.alumnos.map((a) => [
      `${a.apellido}, ${a.nombre}`,
      a.dadoDeBaja ? "Dado de baja" : "Activo",
      a.clasesPrevistas,
      a.asistencias,
      a.inasistencias,
      a.porcentaje,
    ]),
  ];
}

export function armarCsvAsistencia(informe: InformeAsistencia, descripcion: FiltrosDescritos): string {
  const filas = [...bloqueResumen(informe, descripcion), [], ...bloqueProfesoras(informe), [], ...bloqueAlumnos(informe)];
  return documentoCsv(filas.map(fila));
}

export function nombreArchivoAsistencia({ desde, hasta }: Pick<InformeAsistencia, "desde" | "hasta">): string {
  return `asistencia-${desde}-a-${hasta}.csv`;
}
