import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import { estadoVisible } from "@/features/asistencia/utils/formato-clase";
import type { DiaDeLaSemana } from "@/features/asistencia/utils/semana";
import type { Horario } from "@/types/horarios";
import { timeToMinutes } from "./cronograma";

// Tablero semanal de "Mis clases" de la profesora (escritorio): filas por hora y columnas por día. Las
// clases salen de su cronograma; las de hoy, además, de /clases/hoy (estado real e inscriptos).
// Funciones puras.

export interface BloqueDeClase {
  clave: string;
  /** 0 = primera columna de día. */
  columna: number;
  /** 0 = primera fila de hora. */
  fila: number;
  /** Cuántas filas de una hora ocupa. */
  filas: number;
  actividad: string;
  rango: string;
  /** "3/4", o "3 inscriptos" sin cupo; vacío si no se sabe. */
  ocupacion: string;
  grupal: boolean;
  ahora: boolean;
  pasada: boolean;
  cancelada: boolean;
  /** Clase de hoy: lleva a su asistencia. */
  idClase: number | null;
  aria: string;
}

export interface Tablero {
  dias: DiaDeLaSemana[];
  /** "15:00", "16:00"… una por fila. */
  horas: string[];
  bloques: BloqueDeClase[];
}

interface Entrada {
  horarios: Horario[];
  /** Lunes a sábado de la semana que se muestra. */
  semana: DiaDeLaSemana[];
  hoy: string;
  /** Las clases de hoy de la profesora. */
  clasesDeHoy: ClaseDelDiaApi[];
  ahora: Date;
}

function hora(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function ocupacion(inscriptos: number | undefined, cupo: number | null): string {
  if (inscriptos === undefined) return cupo === null ? "" : `Cupo ${cupo}`;
  return cupo === null ? `${inscriptos} inscriptos` : `${inscriptos}/${cupo}`;
}

/** El sábado solo aparece si tiene clases. */
function diasConColumna(semana: DiaDeLaSemana[], horarios: Horario[]): DiaDeLaSemana[] {
  const conSabado = horarios.some((horario) => horario.diaSemana === "SABADO");
  return semana.filter((dia) => dia.dia !== "SABADO" || conSabado);
}

function rangoDeHoras(horarios: Horario[]): { desde: number; hasta: number } {
  const desde = Math.min(...horarios.map((h) => Math.floor(timeToMinutes(h.horaInicio) / 60)));
  const hasta = Math.max(...horarios.map((h) => Math.ceil(timeToMinutes(h.horaFin) / 60)));
  return { desde, hasta: Math.max(hasta, desde + 1) };
}

function bloque(horario: Horario, dia: DiaDeLaSemana, columna: number, desde: number, entrada: Entrada): BloqueDeClase {
  const esHoy = dia.fecha === entrada.hoy;
  const clase = esHoy ? entrada.clasesDeHoy.find((c) => c.id_horario === Number(horario.id)) : undefined;
  const estado = clase ? estadoVisible(clase, true, entrada.ahora) : null;
  const inicio = timeToMinutes(horario.horaInicio);
  const fin = timeToMinutes(horario.horaFin);
  const inscriptos = clase?.inscriptos ?? horario.inscriptos;
  const rango = `${horario.horaInicio} – ${horario.horaFin}`;
  return {
    clave: `${horario.id}-${dia.fecha}`,
    columna,
    fila: Math.floor(inicio / 60) - desde,
    filas: Math.max(1, Math.ceil(fin / 60) - Math.floor(inicio / 60)),
    actividad: horario.actividadNombre,
    rango,
    ocupacion: ocupacion(inscriptos, horario.cupoMaximo),
    grupal: horario.actividadTipo === "GRUPAL",
    ahora: estado === "EN_CURSO",
    pasada: dia.fecha < entrada.hoy || estado === "CERRADA",
    cancelada: estado === "CANCELADA",
    idClase: clase?.id_clase ?? null,
    aria: `${horario.actividadNombre}, ${dia.largo} ${dia.numero} de ${horario.horaInicio} a ${horario.horaFin}${
      inscriptos !== undefined ? `, ${inscriptos} inscriptos` : ""
    }`,
  };
}

export function armarTablero(entrada: Entrada): Tablero {
  const dias = diasConColumna(entrada.semana, entrada.horarios);
  if (entrada.horarios.length === 0) return { dias, horas: [], bloques: [] };
  const { desde, hasta } = rangoDeHoras(entrada.horarios);
  const horas = Array.from({ length: hasta - desde }, (_, i) => hora(desde + i));
  const bloques = dias.flatMap((dia, columna) =>
    entrada.horarios.filter((h) => h.diaSemana === dia.dia).map((h) => bloque(h, dia, columna, desde, entrada)),
  );
  return { dias, horas, bloques };
}
