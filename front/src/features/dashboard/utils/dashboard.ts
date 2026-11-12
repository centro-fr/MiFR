import type { AlumnoResumen } from "@/features/alumnos/schemas/alumno";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import { horaDesdeApi } from "@/features/horarios/utils/cronograma";

// Lo que el dashboard (US-26) arma con datos que ya traen otras pantallas. Funciones puras.

// ---------- Vencen hoy ----------

export interface CuotaQueVenceHoy {
  idAlumno: number;
  alumno: string;
  detalle: string;
  /** Precio vigente del plan; null si no se conoce (plan sin alumnos activos en el reporte). */
  monto: number | null;
}

/** Alumnos activos cuya cuota vence hoy, por nombre. `precios`: precio vigente por nombre de plan. */
export function cuotasQueVencenHoy(
  alumnos: AlumnoResumen[],
  hoy: string,
  precios: ReadonlyMap<string, number>,
): CuotaQueVenceHoy[] {
  return alumnos
    .filter((alumno) => alumno.estado === "ACTIVO" && alumno.situacion_cuota?.fecha_vencimiento === hoy)
    .map((alumno) => ({
      idAlumno: alumno.id_alumno,
      alumno: alumno.nombre_completo,
      detalle: [alumno.plan, alumno.profesora].filter(Boolean).join(" · "),
      monto: alumno.plan ? (precios.get(alumno.plan) ?? null) : null,
    }))
    .sort((a, b) => a.alumno.localeCompare(b.alumno, "es"));
}

// ---------- Clases de hoy ----------

export type EstadoClaseHoy = "Terminada" | "En curso" | "Próxima" | "Cancelada";

export interface ClaseDeHoy {
  id: number;
  hora: string;
  actividad: string;
  profesora: string;
  estado: EstadoClaseHoy;
}

/** `ahora`: "HH:MM" de Argentina. Una clase programada que ya terminó espera su cierre: se ve terminada. */
export function estadoDeClase(clase: Pick<ClaseDelDiaApi, "estado" | "horario">, ahora: string): EstadoClaseHoy {
  if (clase.estado === "CANCELADA") return "Cancelada";
  if (clase.estado === "DICTADA") return "Terminada";
  if (ahora < horaDesdeApi(clase.horario.hora_inicio)) return "Próxima";
  return ahora < horaDesdeApi(clase.horario.hora_fin) ? "En curso" : "Terminada";
}

export function clasesDeHoy(
  clases: ClaseDelDiaApi[],
  ahora: string,
  nombreDeProfesora: (idProfesora: number) => string,
): ClaseDeHoy[] {
  return clases.map((clase) => ({
    id: clase.id_clase,
    hora: horaDesdeApi(clase.horario.hora_inicio),
    actividad: clase.horario.actividad.nombre,
    profesora: nombreDeProfesora(clase.id_prof_dictante),
    estado: estadoDeClase(clase, ahora),
  }));
}

const HORA_ARGENTINA = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** "HH:MM" de ahora en Argentina, para comparar con los horarios de las clases. */
export function horaActualArgentina(ahora: Date = new Date()): string {
  return HORA_ARGENTINA.format(ahora);
}
