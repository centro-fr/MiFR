import type { DiaSemana } from "@/types/horarios";
import { sumarDias } from "./formato-clase";

// Semana de clases de la profesora (lunes a sábado), a partir de fechas AAAA-MM-DD. Funciones puras.

export interface DiaDeLaSemana {
  /** AAAA-MM-DD. */
  fecha: string;
  dia: DiaSemana;
  /** "Lun". */
  corto: string;
  /** "Lunes". */
  largo: string;
  numero: number;
}

const DIAS: { dia: DiaSemana; corto: string; largo: string }[] = [
  { dia: "LUNES", corto: "Lun", largo: "Lunes" },
  { dia: "MARTES", corto: "Mar", largo: "Martes" },
  { dia: "MIERCOLES", corto: "Mié", largo: "Miércoles" },
  { dia: "JUEVES", corto: "Jue", largo: "Jueves" },
  { dia: "VIERNES", corto: "Vie", largo: "Viernes" },
  { dia: "SABADO", corto: "Sáb", largo: "Sábado" },
];

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function partes(fecha: string): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return { anio, mes, dia };
}

/** 1 = lunes … 7 = domingo. */
function diaIso(fecha: string): number {
  const { anio, mes, dia } = partes(fecha);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() || 7;
}

/** El lunes de la semana de `fecha`; el domingo cuenta como el fin de la semana que termina. */
export function lunesDeLaSemana(fecha: string): string {
  return sumarDias(fecha, 1 - diaIso(fecha));
}

/** Lunes a sábado de la semana que empieza en `lunes`. */
export function diasDeLaSemana(lunes: string): DiaDeLaSemana[] {
  return DIAS.map((dia, indice) => {
    const fecha = sumarDias(lunes, indice);
    return { ...dia, fecha, numero: partes(fecha).dia };
  });
}

/** El día que se abre al entrar: hoy, o el lunes siguiente si es domingo. */
export function diaInicial(hoy: string): string {
  return diaIso(hoy) === 7 ? sumarDias(hoy, 1) : hoy;
}

/** "20 de octubre". */
export function diaYMes(fecha: string): string {
  const { mes, dia } = partes(fecha);
  return `${dia} de ${MESES[mes - 1]}`;
}

/** "19 al 24 de octubre" o "27 de octubre al 1 de noviembre". */
export function rangoDeLosDias(dias: Pick<DiaDeLaSemana, "fecha">[]): string {
  const primero = dias[0].fecha;
  const ultimo = dias[dias.length - 1].fecha;
  const mismoMes = partes(primero).mes === partes(ultimo).mes;
  return `${mismoMes ? partes(primero).dia : diaYMes(primero)} al ${diaYMes(ultimo)}`;
}

/** "Semana del 19 al 24 de octubre". */
export function tituloDeLaSemana(dias: DiaDeLaSemana[]): string {
  return `Semana del ${rangoDeLosDias(dias)}`;
}

/** "octubre". */
export function nombreDelMes(fecha: string): string {
  return MESES[partes(fecha).mes - 1];
}
