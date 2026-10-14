import { horaDesdeApi } from "@/features/horarios/utils/cronograma";
import type { ClaseApi } from "@/features/asistencia/schemas/asistencia";

// Formato y estado de una clase para las pantallas de asistencia (US-20). Funciones puras.

export type EstadoVisibleClase = "EN_CURSO" | "PROGRAMADA" | "ABIERTA" | "CERRADA" | "CANCELADA";

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

export function horaActualArgentina(ahora = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(ahora);
}

/**
 * Determina si el momento actual está antes, durante o después del horario de la clase.
 */
export function estadoMomentoClase(
  clase: Pick<ClaseApi, "horario">,
  ahora = new Date()
): "ANTES" | "EN_CURSO" | "DESPUES" {
  const hora = horaActualArgentina(ahora);
  const inicio = horaDesdeApi(clase.horario.hora_inicio);
  const fin = horaDesdeApi(clase.horario.hora_fin);

  if (hora < inicio) return "ANTES";
  if (hora <= fin) return "EN_CURSO";
  return "DESPUES";
}

/**
 * Comprueba si la hora actual está dentro del rango horario de la clase (inicio <= ahora <= fin).
 */
export function estaEnRangoHorario(
  clase: Pick<ClaseApi, "horario">,
  ahora = new Date()
): boolean {
  return estadoMomentoClase(clase, ahora) === "EN_CURSO";
}

/**
 * Lo que importa a quien toma asistencia: si la clase está pasando ahora ("EN_CURSO"), si todavía
 * no comenzó ("PROGRAMADA"), o si ya se cerró/finalizó ("CERRADA").
 * La asistencia se abre únicamente durante el rango horario de la clase para el día de hoy.
 */
export function estadoVisible(
  clase: Pick<ClaseApi, "estado" | "horario">,
  esHoy: boolean,
  ahora = new Date()
): EstadoVisibleClase {
  if (clase.estado === "CANCELADA") return "CANCELADA";
  if (clase.estado === "DICTADA") return "CERRADA";
  if (!esHoy) return "PROGRAMADA";

  const momento = estadoMomentoClase(clase, ahora);
  if (momento === "EN_CURSO") return "EN_CURSO";
  if (momento === "ANTES") return "PROGRAMADA";
  return "CERRADA";
}

/**
 * Determina si la toma de asistencia está habilitada.
 * - Para la profesora: la asistencia se abre ÚNICAMENTE en el rango horario de la clase durante el día de hoy.
 * - Para la propietaria: puede registrar o corregir marcas en cualquier momento (salvo clases canceladas).
 */
export function puedeTomarAsistencia(
  clase: Pick<ClaseApi, "estado" | "horario">,
  esHoy: boolean,
  esPropietaria: boolean,
  ahora = new Date()
): boolean {
  if (clase.estado === "CANCELADA") return false;
  if (esPropietaria) return true;
  if (clase.estado === "DICTADA") return false;
  if (!esHoy) return false;
  return estaEnRangoHorario(clase, ahora);
}

/** Día anterior o siguiente de una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}
