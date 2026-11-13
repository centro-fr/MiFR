import { sumarDias } from "@/features/asistencia/utils/formato-clase";

// Fechas de las clases del alumno (AAAA-MM-DD) como las muestra su panel. Funciones puras.

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function diaDeLaSemana(fecha: string): number {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/** "Mié". */
export function diaCorto(fecha: string): string {
  return DIAS_CORTOS[diaDeLaSemana(fecha)];
}

/** "21". */
export function numeroDelDia(fecha: string): string {
  return String(Number(fecha.slice(8, 10)));
}

/** "Hoy", "Mañana" o "El miércoles". */
export function cuandoEsLaClase(fecha: string, hoy: string): string {
  const dia = fecha.slice(0, 10);
  if (dia === hoy) return "Hoy";
  if (dia === sumarDias(hoy, 1)) return "Mañana";
  return `El ${DIAS_LARGOS[diaDeLaSemana(dia)]}`;
}
