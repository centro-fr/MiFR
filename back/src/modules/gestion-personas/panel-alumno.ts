import { instanteArgentino } from "../../shared/utils/fecha-argentina.js";
import type { MarcaDelAlumno } from "../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type { InscripcionConDatos } from "../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import { diaComoTexto, horaComoTexto, nombreCompleto } from "./formato-respuesta.js";
import type { SituacionCuota } from "./interface/i-logica-personas.js";

// El panel del alumno (US-29): lo arma la fachada de GestionPersonas porque cruza Alumno con la
// inscripción, la cuota y la asistencia, que son de otros subsistemas. Acá van las partes que no
// consultan nada, para probarlas sin mocks.

const UN_DIA_MS = 24 * 60 * 60 * 1000;
// Dos semanas alcanzan para ver la próxima clase de cualquier plan, incluso uno de una vez por semana.
const DIAS_HACIA_ADELANTE = 14;
export const PROXIMAS_CLASES = 5;
export const MARCAS_EN_EL_HISTORIAL = 20;

export interface PlanDelPanel {
  id_inscripcion: number;
  nombre: string;
  tipo: string;
  clases_por_semana: number | null;
  profesora: string;
  // Las actividades de sus horarios: con varios planes, es lo que los distingue en el selector.
  actividades: string[];
  estado_cuota: SituacionCuota["estado"];
  // Sin cuota paga (PENDIENTE_DE_PAGO) no hay vencimiento.
  fecha_vencimiento: string | null;
  dias_restantes: number | null;
}

export interface ClaseDelPanel {
  id_horario: number;
  id_inscripcion: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  actividad: string;
  profesora: string;
  cupo_disponible: number | null;
}

export interface MarcaDelPanel {
  id_clase: number;
  id_inscripcion: number;
  fecha: string;
  actividad: string;
  profesora: string;
  estado: "PRESENTE" | "AUSENTE";
}

export interface PanelAlumno {
  id_alumno: number;
  alumno: { nombre: string; apellido: string };
  // La inscripción principal (la activa más nueva), para quien muestra un solo plan.
  plan: PlanDelPanel | null;
  // Todas las vigentes con su cuota: un alumno puede tener un plan por actividad.
  planes: PlanDelPanel[];
  proximas_clases: ClaseDelPanel[];
  historial_asistencias: MarcaDelPanel[];
}

type HorarioDeLaInscripcion = InscripcionConDatos["horarios"][number];

function rigeEse(dia: Date, { fecha_desde, fecha_hasta, horario }: HorarioDeLaInscripcion): boolean {
  return (
    horario.fecha_baja === null &&
    fecha_desde.getTime() <= dia.getTime() &&
    (fecha_hasta === null || fecha_hasta.getTime() >= dia.getTime())
  );
}

export function planDelPanel(
  inscripcion: InscripcionConDatos,
  situacion: SituacionCuota | null,
): PlanDelPanel | null {
  if (situacion === null) return null;
  return {
    id_inscripcion: inscripcion.id_inscripcion,
    nombre: inscripcion.plan.nombre,
    tipo: inscripcion.plan.tipo,
    clases_por_semana: inscripcion.plan.clases_por_semana,
    profesora: nombreCompleto(inscripcion.profesora.usuario),
    actividades: [...new Set(inscripcion.horarios.map(({ horario }) => horario.actividad.nombre))],
    estado_cuota: situacion.estado,
    fecha_vencimiento: situacion.fecha_vencimiento ? diaComoTexto(situacion.fecha_vencimiento) : null,
    dias_restantes: situacion.dias_restantes,
  };
}

// Los horarios de la inscripción en los próximos días, en orden. Los días de la semana van de 1
// (lunes) a 6 (sábado), como getUTCDay de un DATE; una clase de hoy que ya empezó no figura.
export function proximasClases(
  inscripcion: InscripcionConDatos,
  hoy: Date,
  ahora: Date,
  ocupados: Map<number, number>,
): ClaseDelPanel[] {
  const clases: (ClaseDelPanel & { inicio: number })[] = [];
  for (let dias = 0; dias < DIAS_HACIA_ADELANTE; dias++) {
    const dia = new Date(hoy.getTime() + dias * UN_DIA_MS);
    for (const vigente of inscripcion.horarios) {
      const { horario } = vigente;
      if (horario.dia_semana !== dia.getUTCDay() || !rigeEse(dia, vigente)) continue;
      const inicio = instanteArgentino(dia, horario.hora_inicio).getTime();
      if (inicio <= ahora.getTime()) continue;
      const cupo = horario.cupo_maximo ?? horario.actividad.cupo_maximo;
      clases.push({
        inicio,
        id_horario: horario.id_horario,
        id_inscripcion: inscripcion.id_inscripcion,
        fecha: diaComoTexto(dia),
        hora_inicio: horaComoTexto(horario.hora_inicio),
        hora_fin: horaComoTexto(horario.hora_fin),
        actividad: horario.actividad.nombre,
        profesora: nombreCompleto(horario.profesora.usuario),
        cupo_disponible: cupo === null ? null : Math.max(0, cupo - (ocupados.get(horario.id_horario) ?? 0)),
      });
    }
  }
  return clases
    .sort((a, b) => a.inicio - b.inicio)
    .slice(0, PROXIMAS_CLASES)
    .map(({ inicio: _inicio, ...clase }) => clase);
}

export function historialDelPanel(marcas: MarcaDelAlumno[]): MarcaDelPanel[] {
  return marcas.map(({ id_clase, id_inscripcion, fecha_clase, actividad, profesora, asistio }) => ({
    id_clase,
    id_inscripcion,
    fecha: diaComoTexto(fecha_clase),
    actividad,
    profesora: nombreCompleto(profesora),
    estado: asistio ? "PRESENTE" : "AUSENTE",
  }));
}

// Las próximas clases de todos los planes del alumno, en orden, con el mismo tope que las de uno.
export function proximasClasesDeTodas(
  inscripciones: InscripcionConDatos[],
  hoy: Date,
  ahora: Date,
  ocupados: Map<number, number>,
): ClaseDelPanel[] {
  return inscripciones
    .flatMap((inscripcion) => proximasClases(inscripcion, hoy, ahora, ocupados))
    .sort((a, b) => `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`))
    .slice(0, PROXIMAS_CLASES);
}
