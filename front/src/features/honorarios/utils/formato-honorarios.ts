import type {
  ConceptoTarifa,
  EstadoLiquidacion,
  LiquidacionResumen,
  TarifaAplicada,
  TarifaHonorario,
} from "@/types/honorarios";
import { formatearPrecio } from "@/utils/moneda";

const FORMATO_PORCENTAJE = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export const ETIQUETA_ESTADO: Record<EstadoLiquidacion, string> = {
  BORRADOR: "En revisión",
  CERRADA: "Cerrada",
  // Glosario: el sistema no procesa pagos. "Abonada" solo registra que se le abonó por fuera.
  PAGADA: "Abonada",
};

export const ETIQUETA_CONCEPTO: Record<ConceptoTarifa, string> = {
  ALUMNO_A_CARGO: "Por alumno a cargo",
  HORA_SUPLENCIA: "Por hora de suplencia",
};

/** "50% de lo cobrado", "$ 8.000 por alumno" o "$ 5.000 por hora". */
export function describirTarifa(tarifa: TarifaAplicada, concepto: ConceptoTarifa): string {
  if (tarifa.tipoValor === "PORCENTAJE") return `${FORMATO_PORCENTAJE.format(tarifa.valor)}% de lo cobrado`;
  return `${formatearPrecio(tarifa.valor)} ${concepto === "ALUMNO_A_CARGO" ? "por alumno" : "por hora"}`;
}

/**
 * Con PORCENTAJE el back guarda solo el monto: lo cobrado se recupera dividiendo por la tarifa.
 * Sirve para mostrar la base del cálculo ("$ 25.000 × 50%"), no para volver a calcular.
 */
export function baseCobrada(monto: number, tarifa: TarifaAplicada): number | null {
  if (tarifa.tipoValor !== "PORCENTAJE" || tarifa.valor === 0) return null;
  return Math.round((monto * 100 * 100) / tarifa.valor) / 100;
}

/** "+$ 6.000", "−$ 6.000" o "—" si no hubo suplencias. */
export function formatearAjuste(monto: number): string {
  if (monto === 0) return "—";
  return `${monto > 0 ? "+" : "−"}${formatearPrecio(Math.abs(monto))}`;
}

export function nombreCompleto({ nombre, apellido }: { nombre: string; apellido: string }): string {
  return `${nombre} ${apellido}`.trim();
}

export function inicialesDe({ nombre, apellido }: { nombre: string; apellido: string }): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

/** AAAA-MM-DD → "13/10/2026". */
export function fechaCorta(dia: string): string {
  return new Date(`${dia.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

/** Timestamp ISO → "20/10/2026, 11:30" en hora de Argentina. */
export function fechaHora(instante: string): string {
  return new Date(instante).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tarifa que rige un día (AAAA-MM-DD) para todos los planes; la de un plan puntual no cuenta acá. */
export function tarifaGeneralVigente(
  tarifas: TarifaHonorario[],
  idProfesora: number,
  concepto: ConceptoTarifa,
  dia: string,
): TarifaHonorario | undefined {
  return tarifas.find(
    (tarifa) =>
      tarifa.idProfesora === idProfesora &&
      tarifa.concepto === concepto &&
      tarifa.plan === null &&
      tarifa.desde <= dia &&
      (tarifa.hasta === null || tarifa.hasta >= dia),
  );
}

/** Las tarifas de un plan puntual que rigen ese día: ganan a la general para ese plan. */
export function tarifasPorPlanVigentes(tarifas: TarifaHonorario[], idProfesora: number, dia: string): TarifaHonorario[] {
  return tarifas.filter(
    (tarifa) =>
      tarifa.idProfesora === idProfesora &&
      tarifa.plan !== null &&
      tarifa.desde <= dia &&
      (tarifa.hasta === null || tarifa.hasta >= dia),
  );
}

/** La última tarifa cargada para todos los planes, rija ya o esté programada: una nueva tiene que empezar después. */
export function ultimaTarifaGeneral(
  tarifas: TarifaHonorario[],
  idProfesora: number,
  concepto: ConceptoTarifa,
): TarifaHonorario | undefined {
  return tarifas
    .filter((tarifa) => tarifa.idProfesora === idProfesora && tarifa.concepto === concepto && tarifa.plan === null)
    .sort((a, b) => b.desde.localeCompare(a.desde))[0];
}

/** El estado del mes para la tarjeta de resumen: si queda algo en revisión, el mes está en revisión. */
export function estadoDelMes(liquidaciones: LiquidacionResumen[]): EstadoLiquidacion {
  if (liquidaciones.some((fila) => fila.estado === "BORRADOR")) return "BORRADOR";
  if (liquidaciones.some((fila) => fila.estado === "CERRADA")) return "CERRADA";
  return "PAGADA";
}

/** Cuándo se calculó por última vez lo que sigue en revisión (o todo, si ya está cerrado). */
export function ultimoCalculo(liquidaciones: LiquidacionResumen[]): string | null {
  const enRevision = liquidaciones.filter((fila) => fila.estado === "BORRADOR");
  const filas = enRevision.length > 0 ? enRevision : liquidaciones;
  return filas.map((fila) => fila.calculadaEl).sort().at(-1) ?? null;
}
