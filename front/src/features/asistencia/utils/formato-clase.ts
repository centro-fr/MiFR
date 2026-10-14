import { horaDesdeApi } from "@/features/horarios/utils/cronograma";
import type { ClaseApi } from "@/features/asistencia/schemas/asistencia";

// Formato y estado de una clase para las pantallas de asistencia (US-20). Funciones puras.

export type EstadoVisibleClase = "EN_CURSO" | "ABIERTA" | "CERRADA" | "CANCELADA";

/** "09:00 a 10:00", como el resto de la app (24 h: en Argentina no se usa a. m./p. m.). */
export function rangoHorario(clase: Pick<ClaseApi, "horario">): string {
  return `${horaDesdeApi(clase.horario.hora_inicio)} a ${horaDesdeApi(clase.horario.hora_fin)}`;
}

/** "martes, 13 de octubre de 2026". */
export function fechaLarga(fecha: string): string {
  const mediodiaUtc = new Date(`${fecha.slice(0, 10)}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeZone: "America/Argentina/Buenos_Aires" }).format(mediodiaUtc);
}

/** "13 oct 2026 a las 22:41" (hora argentina). */
export function fechaYHoraCorta(instante: string): string {
  const fecha = new Date(instante);
  const dia = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" }).format(fecha);
  const hora = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(fecha);
  return `${dia} a las ${hora}`;
}

function horaActualArgentina(ahora: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(ahora);
}

/**
 * Lo que importa a quien toma asistencia: si la clase está pasando ahora, si todavía se puede
 * marcar, o si ya se cerró. "En curso" solo aplica a una clase abierta del día de hoy.
 */
export function estadoVisible(clase: Pick<ClaseApi, "estado" | "horario">, esHoy: boolean, ahora = new Date()): EstadoVisibleClase {
  if (clase.estado === "CANCELADA") return "CANCELADA";
  if (clase.estado === "DICTADA") return "CERRADA";
  if (!esHoy) return "ABIERTA";
  const hora = horaActualArgentina(ahora);
  const enCurso = hora >= horaDesdeApi(clase.horario.hora_inicio) && hora < horaDesdeApi(clase.horario.hora_fin);
  return enCurso ? "EN_CURSO" : "ABIERTA";
}

/** Día anterior o siguiente de una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}
