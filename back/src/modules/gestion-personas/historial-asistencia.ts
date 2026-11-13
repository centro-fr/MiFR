import type {
  HistorialDelAlumno,
  MarcaDelAlumno,
} from "../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import { diaComoTexto, horaComoTexto, nombreCompleto } from "./formato-respuesta.js";

// El historial de asistencia de la ficha del alumno (US-10).

export interface MarcaDelHistorial {
  id_clase: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  actividad: string;
  profesora: string;
  asistio: boolean;
  observaciones: string | null;
}

export interface PaginaHistorialAsistencia {
  datos: MarcaDelHistorial[];
  total: number;
  presentes: number;
  ausentes: number;
  limit: number;
  offset: number;
}

function aMarcaDelHistorial(marca: MarcaDelAlumno): MarcaDelHistorial {
  return {
    id_clase: marca.id_clase,
    fecha: diaComoTexto(marca.fecha_clase),
    hora_inicio: horaComoTexto(marca.hora_inicio),
    hora_fin: horaComoTexto(marca.hora_fin),
    actividad: marca.actividad,
    profesora: nombreCompleto(marca.profesora),
    asistio: marca.asistio,
    observaciones: marca.observaciones,
  };
}

export function paginaDelHistorial(
  historial: HistorialDelAlumno,
  { limit, offset }: { limit: number; offset: number },
): PaginaHistorialAsistencia {
  return { ...historial, datos: historial.datos.map(aMarcaDelHistorial), limit, offset };
}
