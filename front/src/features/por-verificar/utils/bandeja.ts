import { etiquetaTipo } from "@/features/transferencias/utils/formato-transferencia";
import type { PreInscripcionPendiente } from "@/types/alta-definitiva";
import type { Transferencia } from "@/types/transferencia";

// "Por verificar" (issue #49): las transferencias informadas que esperan revisión (US-17) y las altas
// nuevas que todavía no pagaron (US-07), en una sola lista. Para la propietaria son la misma tarea:
// revisar un pago y dejar a alguien al día o dado de alta.

interface Comun {
  clave: string;
  idAlumno: number;
  alumno: string;
  /** "Transferencia" o "Alta nueva". */
  concepto: string;
  /** Qué cuota paga la transferencia ("Primera cuota") o el plan del alta; null si no se sabe. */
  cuotaOPlan: string | null;
  /** Cuándo se informó la transferencia, o hasta cuándo guarda el lugar la reserva del alta. */
  cuando: string | null;
  /** Cuota o plan y fecha en una línea. */
  dato: string;
  /** Concepto y dato en una línea, para la lista. */
  detalle: string;
  monto: number;
  /** Timestamp ISO con el que se ordena: lo más reciente primero. */
  fecha: string;
}

export type PendientePorVerificar =
  | (Comun & { tipo: "TRANSFERENCIA"; transferencia: Transferencia })
  | (Comun & { tipo: "ALTA"; alta: PreInscripcionPendiente });

const DIA_HORA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** "2026-10-18T12:40:00Z" → "18/10 09:40" (hora de Argentina). */
function diaHora(timestamp: string): string {
  return DIA_HORA.format(new Date(timestamp)).replace(",", "");
}

/** "2026-10-20" → "20/10". La reserva es una fecha de calendario: no se convierte de zona. */
function diaMes(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

const TRANSFERENCIA = "Transferencia";
const ALTA_NUEVA = "Alta nueva";

function cuandoDeTransferencia(transferencia: Transferencia): string {
  return diaHora(transferencia.realizadaEl ?? transferencia.cargadaEl);
}

function cuandoDeAlta(alta: PreInscripcionPendiente): string | null {
  if (!alta.reserva) return null;
  return alta.reserva.vencida ? `reserva vencida el ${diaMes(alta.reserva.vence)}` : `reserva hasta el ${diaMes(alta.reserva.vence)}`;
}

function enUnaLinea(...partes: (string | null)[]): string {
  return partes.filter(Boolean).join(" · ");
}

function datoDeTransferencia(transferencia: Transferencia): string {
  return enUnaLinea(transferencia.tipo ? etiquetaTipo(transferencia.tipo) : null, cuandoDeTransferencia(transferencia));
}

function datoDeAlta(alta: PreInscripcionPendiente): string {
  return enUnaLinea(alta.nombrePlan, cuandoDeAlta(alta));
}

export function detalleDeTransferencia(transferencia: Transferencia): string {
  return `${TRANSFERENCIA} · ${datoDeTransferencia(transferencia)}`;
}

export function detalleDeAlta(alta: PreInscripcionPendiente): string {
  return `${ALTA_NUEVA} · ${datoDeAlta(alta)}`;
}

/**
 * Une las dos listas, la más reciente primero. Si la primera cuota de un alta ya llegó por
 * transferencia, figura una sola vez, como transferencia: al verificarla se completa el alta. Un
 * pre-inscripto solo puede estar pagando su primera cuota, así que alcanza con que tenga una
 * transferencia pendiente (no depende de que el back informe el tipo).
 */
export function armarBandeja(transferencias: Transferencia[], altas: PreInscripcionPendiente[]): PendientePorVerificar[] {
  const conPrimeraCuotaInformada = new Set(transferencias.map((t) => String(t.alumno.id)));
  const preInscriptos = new Set(altas.map((alta) => alta.idAlumno));
  const conTipo = (t: Transferencia): Transferencia =>
    t.tipo || !preInscriptos.has(String(t.alumno.id)) ? t : { ...t, tipo: "PRIMERA_CUOTA" };

  const deTransferencias: PendientePorVerificar[] = transferencias.map((original) => {
    const transferencia = conTipo(original);
    return {
      tipo: "TRANSFERENCIA",
      clave: `transferencia-${transferencia.id}`,
      idAlumno: transferencia.alumno.id,
      alumno: `${transferencia.alumno.nombre} ${transferencia.alumno.apellido}`,
      concepto: TRANSFERENCIA,
      cuotaOPlan: transferencia.tipo ? etiquetaTipo(transferencia.tipo) : null,
      cuando: cuandoDeTransferencia(transferencia),
      dato: datoDeTransferencia(transferencia),
      detalle: detalleDeTransferencia(transferencia),
      monto: transferencia.monto,
      fecha: transferencia.cargadaEl,
      transferencia: original,
    };
  });

  const deAltas: PendientePorVerificar[] = altas
    .filter((alta) => !conPrimeraCuotaInformada.has(alta.idAlumno))
    .map((alta) => ({
      tipo: "ALTA",
      clave: `alta-${alta.idInscripcion}`,
      idAlumno: Number(alta.idAlumno),
      alumno: `${alta.nombre} ${alta.apellido}`,
      concepto: ALTA_NUEVA,
      cuotaOPlan: alta.nombrePlan,
      cuando: cuandoDeAlta(alta),
      dato: datoDeAlta(alta),
      detalle: detalleDeAlta(alta),
      monto: alta.precio,
      fecha: alta.fechaPreInscripcion,
      alta,
    }));

  return [...deTransferencias, ...deAltas].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
