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
  /** El plan que se paga; null si el back no lo informa. */
  plan: string | null;
  /** Qué cuota se paga: "Primera cuota", "Renovación" o "Cuota vencida". */
  cuota: string;
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

// Sin el tipo del back (las de "Mis transferencias"), lo más común: una renovación.
function cuotaDeTransferencia(transferencia: Transferencia): string {
  return transferencia.tipo ? etiquetaTipo(transferencia.tipo) : "Renovación";
}

function datoDeTransferencia(transferencia: Transferencia): string {
  return enUnaLinea(
    transferencia.plan ?? null,
    transferencia.tipo ? etiquetaTipo(transferencia.tipo) : null,
    cuandoDeTransferencia(transferencia),
  );
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

// Un alumno puede tener varios planes y una pre-inscripción en cada uno: la transferencia paga el
// alta de su propia inscripción. Sin el id (un back anterior), se reconoce por el alumno.
function pagaLaPreInscripcion(transferencia: Transferencia, alta: PreInscripcionPendiente): boolean {
  if (transferencia.idInscripcion != null) return String(transferencia.idInscripcion) === alta.idInscripcion;
  return String(transferencia.alumno.id) === alta.idAlumno;
}

/**
 * Une las dos listas, la más reciente primero, con una fila por pago: un alumno con dos planes
 * aparece una vez por cada uno y se verifica de a uno. Si la primera cuota de un alta ya llegó por
 * transferencia, figura una sola vez, como transferencia: al verificarla se completa el alta. Una
 * pre-inscripción solo puede estar pagando su primera cuota, así que alcanza con que tenga una
 * transferencia pendiente (no depende de que el back informe el tipo).
 */
export function armarBandeja(transferencias: Transferencia[], altas: PreInscripcionPendiente[]): PendientePorVerificar[] {
  const conTipo = (t: Transferencia): Transferencia =>
    t.tipo || !altas.some((alta) => pagaLaPreInscripcion(t, alta)) ? t : { ...t, tipo: "PRIMERA_CUOTA" };

  const deTransferencias: PendientePorVerificar[] = transferencias.map((original) => {
    const transferencia = conTipo(original);
    return {
      tipo: "TRANSFERENCIA",
      clave: `transferencia-${transferencia.id}`,
      idAlumno: transferencia.alumno.id,
      alumno: `${transferencia.alumno.nombre} ${transferencia.alumno.apellido}`,
      concepto: TRANSFERENCIA,
      plan: transferencia.plan ?? null,
      cuota: cuotaDeTransferencia(transferencia),
      cuando: cuandoDeTransferencia(transferencia),
      dato: datoDeTransferencia(transferencia),
      detalle: detalleDeTransferencia(transferencia),
      monto: transferencia.monto,
      fecha: transferencia.cargadaEl,
      transferencia: original,
    };
  });

  const deAltas: PendientePorVerificar[] = altas
    .filter((alta) => !transferencias.some((transferencia) => pagaLaPreInscripcion(transferencia, alta)))
    .map((alta) => ({
      tipo: "ALTA",
      clave: `alta-${alta.idInscripcion}`,
      idAlumno: Number(alta.idAlumno),
      alumno: `${alta.nombre} ${alta.apellido}`,
      concepto: ALTA_NUEVA,
      plan: alta.nombrePlan,
      // El alta se completa con el primer pago.
      cuota: etiquetaTipo("PRIMERA_CUOTA"),
      cuando: cuandoDeAlta(alta),
      dato: datoDeAlta(alta),
      detalle: detalleDeAlta(alta),
      monto: alta.precio,
      fecha: alta.fechaPreInscripcion,
      alta,
    }));

  return [...deTransferencias, ...deAltas].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
