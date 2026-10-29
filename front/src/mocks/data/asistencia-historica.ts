import type { AlumnoMock } from "@/mocks/data/alumnos";
import type { InscripcionMock } from "@/mocks/data/inscripciones";
import type { HorarioSemilla } from "@/mocks/data/semilla";

// Historial de asistencia para el informe de US-33. En el mock, db.clases y db.asistencias arrancan
// vacías (se llenan al tomar asistencia hoy), así que sin esto el informe saldría siempre vacío. Se
// arma con los horarios e inscripciones de la semilla: una clase dictada por cada día que tocaba desde
// INICIO hasta ayer, con una marca por inscripto. Queda aparte de db para no cambiar otras pantallas.

/** Una marca de asistencia de una clase dictada, con lo que el informe necesita para filtrar. */
export interface MarcaDeAsistencia {
  /** AAAA-MM-DD. */
  fecha: string;
  id_horario: number;
  id_actividad: number;
  /** La que dictó la clase. */
  id_profesora: number;
  id_alumno: number;
  asistio: boolean;
}

const INICIO = "2026-08-03";
const UN_DIA_MS = 86_400_000;

const instante = (dia: string) => Date.parse(`${dia}T00:00:00Z`);
const diaDe = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** 1 = lunes … 7 = domingo, como dia_semana de horarios. */
function diaDeLaSemana(dia: string): number {
  const numero = new Date(instante(dia)).getUTCDay();
  return numero === 0 ? 7 : numero;
}

// Cada alumno tiene su propia constancia (entre 55 % y 94 %) y el resultado de cada clase sale de un
// cálculo fijo: el mismo día siempre da lo mismo, sin azar entre recargas.
function asistio(idAlumno: number, dia: string, idHorario: number): boolean {
  const constancia = 55 + ((idAlumno * 37) % 40);
  // Mezcla de enteros de 32 bits: la misma entrada da la misma tirada, pero semana a semana varía.
  let mezcla = Math.imul(idAlumno, 374_761_393) ^ Math.imul(instante(dia) / UN_DIA_MS, 668_265_263) ^ Math.imul(idHorario, 1_274_126_177);
  mezcla = Math.imul(mezcla ^ (mezcla >>> 15), 2_246_822_519);
  mezcla ^= mezcla >>> 13;
  return (mezcla >>> 0) % 100 < constancia;
}

function aCargoEseDia(inscripcion: InscripcionMock, dia: string): boolean {
  if (inscripcion.estado === "PREINSCRIPTA" || inscripcion.fecha_inicio.slice(0, 10) > dia) return false;
  return inscripcion.fecha_baja === null || inscripcion.fecha_baja.slice(0, 10) > dia;
}

interface Semilla {
  horarios: HorarioSemilla[];
  inscripciones: InscripcionMock[];
  alumnos: AlumnoMock[];
}

/** `hasta` exclusivo (AAAA-MM-DD): las clases de hoy las cierra el mock de asistencia. */
export function asistenciaHistorica({ horarios, inscripciones, alumnos }: Semilla, hasta: string): MarcaDeAsistencia[] {
  const conAlumno = inscripciones.filter((inscripcion) => alumnos.some((alumno) => alumno.id_alumno === inscripcion.id_alumno));
  const marcas: MarcaDeAsistencia[] = [];
  for (let ms = instante(INICIO); ms < instante(hasta); ms += UN_DIA_MS) {
    const dia = diaDe(ms);
    for (const horario of horarios.filter((h) => h.dia_semana === diaDeLaSemana(dia))) {
      for (const inscripcion of conAlumno.filter((i) => i.ids_horarios.includes(horario.id_horario) && aCargoEseDia(i, dia))) {
        marcas.push({
          fecha: dia,
          id_horario: horario.id_horario,
          id_actividad: horario.id_actividad,
          id_profesora: horario.id_profesora,
          id_alumno: inscripcion.id_alumno,
          asistio: asistio(inscripcion.id_alumno, dia, horario.id_horario),
        });
      }
    }
  }
  return marcas;
}
