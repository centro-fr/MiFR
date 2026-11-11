import { fechaActualArgentina } from "@/utils/fecha";

// El período de una liquidación es un mes calendario, como AAAA-MM (el `periodo` del back).

const PERIODO = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Meses que ofrece el selector: el actual y los anteriores, para consultar informes pasados. */
export const MESES_CONSULTABLES = 12;

export const MESES_DEL_ANIO = [
  { valor: "01", etiqueta: "Enero" },
  { valor: "02", etiqueta: "Febrero" },
  { valor: "03", etiqueta: "Marzo" },
  { valor: "04", etiqueta: "Abril" },
  { valor: "05", etiqueta: "Mayo" },
  { valor: "06", etiqueta: "Junio" },
  { valor: "07", etiqueta: "Julio" },
  { valor: "08", etiqueta: "Agosto" },
  { valor: "09", etiqueta: "Septiembre" },
  { valor: "10", etiqueta: "Octubre" },
  { valor: "11", etiqueta: "Noviembre" },
  { valor: "12", etiqueta: "Diciembre" },
] as const;

export function nombreDelMes(mes: string | number): string {
  const numero = typeof mes === "string" ? Number(mes) : mes;
  const encontrado = MESES_DEL_ANIO[numero - 1];
  return encontrado ? encontrado.etiqueta : "";
}

export function aniosConsultablesHonorarios(anioSeleccionado?: number): number[] {
  const anioActualNum = Number(periodoActual().slice(0, 4));
  const base = [anioActualNum, anioActualNum - 1, anioActualNum - 2, anioActualNum - 3];
  if (anioSeleccionado && !base.includes(anioSeleccionado)) {
    base.push(anioSeleccionado);
  }
  return base.sort((a, b) => b - a);
}

export function esPeriodoFuturo(anio: number, mes: number): boolean {
  const [anioActual, mesActual] = periodoActual().split("-").map(Number);
  return anio > anioActual || (anio === anioActual && mes > mesActual);
}

const FORMATO_MES = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });

export function periodoActual(): string {
  return fechaActualArgentina().slice(0, 7);
}

/** El mes de la URL si es válido y ya empezó; si no, el actual. No se liquida un mes que no empezó. */
export function periodoDesdeParametro(valor: string | null): string {
  const actual = periodoActual();
  return valor !== null && PERIODO.test(valor) && valor <= actual ? valor : actual;
}

function sumarMeses(periodo: string, meses: number): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  return fecha.toISOString().slice(0, 7);
}

/** Del más reciente al más antiguo, empezando por el mes actual. */
export function periodosConsultables(cantidad = MESES_CONSULTABLES): string[] {
  const actual = periodoActual();
  return Array.from({ length: cantidad }, (_, indice) => sumarMeses(actual, -indice));
}

/** "2026-10" → "Octubre 2026". */
export function etiquetaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const texto = FORMATO_MES.format(new Date(Date.UTC(anio, mes - 1, 1))).replace(" de ", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function primerDiaDe(periodo: string): string {
  return `${periodo}-01`;
}

export function ultimoDiaDe(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
}

export function esPeriodoEnCurso(periodo: string): boolean {
  return periodo === periodoActual();
}

/**
 * Valor inicial del parámetro DIA_CIERRE_HONORARIOS del back: el día del mes siguiente en que cada mes
 * se cierra solo. Honorarios lee el valor real (useDiaDeCierre); este solo lo usa quien todavía no lo lee.
 */
export const DIA_CIERRE_INICIAL = 5;

/** El primer mes posterior a `periodo` (AAAA-MM). */
export function mesSiguiente(periodo: string): string {
  return sumarMeses(periodo, 1);
}

/** AAAA-MM-DD del día en que `periodo` se cierra solo. */
function fechaDeCierre(periodo: string, diaDeCierre: number): string {
  return `${mesSiguiente(periodo)}-${String(diaDeCierre).padStart(2, "0")}`;
}

/**
 * Abierto: el mes en curso, o el anterior hasta el día de cierre. Hasta ese día los montos todavía
 * pueden cambiar, para que entren las transferencias de fin de mes que se aprueban tarde.
 */
export function mesSigueAbierto(periodo: string, diaDeCierre = DIA_CIERRE_INICIAL, hoy = fechaActualArgentina()): boolean {
  return hoy < fechaDeCierre(periodo, diaDeCierre);
}

/** "5 de noviembre". */
export function diaDeCierreLegible(periodo: string, diaDeCierre = DIA_CIERRE_INICIAL): string {
  const [anio, mes] = mesSiguiente(periodo).split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(anio, mes - 1, diaDeCierre)),
  );
}
