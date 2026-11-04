import type {
  AlcanceTarifa,
  ConceptoTarifa,
  EstadoLiquidacion,
  LineaAlumno,
  LineaSuplencia,
  LiquidacionResumen,
  TarifaAplicada,
  TarifaHonorario,
} from "@/types/honorarios";
import { formatearPrecio } from "@/utils/moneda";

const FORMATO_PORCENTAJE = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export const ETIQUETA_ESTADO: Record<EstadoLiquidacion, string> = {
  // El mes abierto se recalcula solo; al cerrarse queda fijo y falta abonarlo.
  BORRADOR: "En curso",
  CERRADA: "Para abonar",
  // Glosario: el sistema no procesa pagos. "Abonada" solo registra que se le abonó por fuera.
  PAGADA: "Abonada",
};

export const ETIQUETA_CONCEPTO: Record<ConceptoTarifa, string> = {
  ALUMNO_A_CARGO: "Por alumno a cargo",
  HORA_SUPLENCIA: "Por hora de suplencia",
};

/** "50% de lo cobrado", "$ 8.000 por alumno", "$ 5.000 por hora" o "—" si no se conoce. */
export function describirTarifa(tarifa: TarifaAplicada | null, concepto: ConceptoTarifa): string {
  if (!tarifa) return "—";
  if (tarifa.tipoValor === "PORCENTAJE") return `${FORMATO_PORCENTAJE.format(tarifa.valor)}% de lo cobrado`;
  return `${formatearPrecio(tarifa.valor)} ${concepto === "ALUMNO_A_CARGO" ? "por alumno" : "por hora"}`;
}

/**
 * Con PORCENTAJE el back guarda solo el monto: lo cobrado se recupera dividiendo por la tarifa.
 * Sirve para mostrar la base del cálculo ("$ 25.000 × 50%"), no para volver a calcular.
 */
export function baseCobrada(monto: number, tarifa: TarifaAplicada | null): number | null {
  if (!tarifa || tarifa.tipoValor !== "PORCENTAJE" || tarifa.valor === 0) return null;
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

/** "Activa", "Baja el 13/10/2026" o "—" si el back no mandó la inscripción. */
export function situacionDeLaLinea({ inscripcion }: LineaAlumno): string {
  if (!inscripcion) return "—";
  return inscripcion.estado === "BAJA" && inscripcion.fechaBaja ? `Baja el ${fechaCorta(inscripcion.fechaBaja)}` : "Activa";
}

/** "Cubrió a Ana Pérez" / "La cubrió Ana Pérez", o el concepto si el back no mandó quién. */
export function quienDeLaSuplencia({ concepto, clase }: LineaSuplencia): string {
  if (concepto === "CLASE_SUPLIDA") return clase.ausente ? `Cubrió a ${nombreCompleto(clase.ausente)}` : "Cubrió una clase";
  return clase.suplente ? `La cubrió ${nombreCompleto(clase.suplente)}` : "Le cubrieron una clase";
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

/** Las tarifas de un alcance: el porcentaje general por alumno o la hora de suplencia de una profesora. */
export function tarifasDelAlcance(tarifas: TarifaHonorario[], alcance: AlcanceTarifa): TarifaHonorario[] {
  const idProfesora = alcance.concepto === "HORA_SUPLENCIA" ? alcance.profesora.id : null;
  return tarifas.filter((tarifa) => tarifa.concepto === alcance.concepto && tarifa.idProfesora === idProfesora);
}

/** La que rige un día (AAAA-MM-DD) entre las tarifas de un mismo alcance. */
export function tarifaVigente(tarifas: TarifaHonorario[], dia: string): TarifaHonorario | undefined {
  return tarifas.find((tarifa) => tarifa.desde <= dia && (tarifa.hasta === null || tarifa.hasta >= dia));
}

/** Desde cuándo rige la última tarifa de un alcance, vigente o programada: una nueva tiene que empezar después. */
export function inicioDeLaUltimaTarifa(tarifas: TarifaHonorario[]): string | null {
  return tarifas.map((tarifa) => tarifa.desde).sort().at(-1) ?? null;
}

/** Alumnos a cargo de todo el mes; null si alguna liquidación llegó sin desglose. */
export function alumnosDelMes(liquidaciones: LiquidacionResumen[]): number | null {
  let total = 0;
  for (const { desglose } of liquidaciones) {
    if (!desglose) return null;
    total += desglose.cantidadAlumnos;
  }
  return total;
}

/** "3 alumnos a cargo · se cuenta…" o solo la regla si no se sabe cuántos son. */
export function leyendaDelTotal(alumnos: number | null): string {
  const regla = "se cuenta cada inscripto, asista o no";
  if (alumnos === null) return regla.charAt(0).toUpperCase() + regla.slice(1);
  return `${alumnos} ${alumnos === 1 ? "alumno a cargo" : "alumnos a cargo"} · ${regla}`;
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

/** "1 alumno" o "3 alumnos". */
export function cantidadDeAlumnos(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "alumno" : "alumnos"}`;
}
