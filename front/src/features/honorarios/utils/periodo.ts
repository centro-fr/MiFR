import { fechaActualArgentina } from "@/utils/fecha";

// El período de una liquidación es un mes calendario, como AAAA-MM (el `periodo` del back).

const PERIODO = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Meses que ofrece el selector: el actual y los anteriores, para consultar informes pasados. */
export const MESES_CONSULTABLES = 12;

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
