import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { PlanApiRespuesta } from "@/types/plan";

// Qué profesoras y horarios corresponden a un plan en la pre-inscripción (US-05). Replica las
// reglas de validarHorarios del back (inscripcion.service.ts): todos los horarios son de una misma
// profesora y de una única actividad (regla del Estudio Inicial).

type ReglasDelPlan = Pick<PlanApiRespuesta, "tipo" | "clases_por_semana" | "id_actividad_exclusiva">;

/**
 * Horarios que se pueden ofrecer según la edad (verificarActividadesParaLaEdad del back): un plan solo para
 * menores ofrece solo actividades para menores, y a un mayor no se le ofrecen. Sin dato de la edad no se
 * descarta nada por edad.
 */
export function horariosParaLaEdad(
  horarios: HorarioApi[],
  plan: Pick<PlanApiRespuesta, "solo_menores"> | null,
  menorDeEdad?: boolean,
): HorarioApi[] {
  return horarios.filter(({ actividad }) => {
    const infantil = actividad.solo_menores === true;
    if (plan?.solo_menores && !infantil) return false;
    return !(infantil && menorDeEdad === false);
  });
}

/** Clases por semana que hay que elegir: una para la clase suelta. */
export function clasesRequeridasDelPlan(plan: ReglasDelPlan | null): number {
  if (!plan) return 0;
  if (plan.tipo === "CLASE_SUELTA") return 1;
  return plan.clases_por_semana ?? 1;
}

/** Horarios de la profesora que el plan permite elegir. */
export function horariosDelPlan(horarios: HorarioApi[], plan: ReglasDelPlan | null, idProfesora: number | null): HorarioApi[] {
  if (!plan || idProfesora === null) return [];
  return horarios.filter(
    (horario) =>
      horario.id_profesora === idProfesora &&
      (plan.id_actividad_exclusiva === null || horario.id_actividad === plan.id_actividad_exclusiva),
  );
}

export interface GrupoHorariosActividad {
  id_actividad: number;
  nombre: string;
  modalidad?: string;
  requiere_medidas?: boolean;
  horarios: HorarioApi[];
  /** Indica si la actividad cuenta con suficientes horarios para la frecuencia del plan. */
  viable: boolean;
}

/**
 * Agrupa los horarios permitidos de una profesora por actividad y calcula su viabilidad para el plan.
 */
export function agruparHorariosPorActividad(
  horarios: HorarioApi[],
  plan: ReglasDelPlan | null,
  idProfesora: number | null,
): GrupoHorariosActividad[] {
  const permitidos = horariosDelPlan(horarios, plan, idProfesora);
  const requeridas = clasesRequeridasDelPlan(plan);
  const mapa = new Map<number, GrupoHorariosActividad>();

  for (const h of permitidos) {
    let grupo = mapa.get(h.id_actividad);
    if (!grupo) {
      grupo = {
        id_actividad: h.id_actividad,
        nombre: h.actividad.nombre,
        modalidad: h.actividad.modalidad,
        requiere_medidas: h.actividad.requiere_medidas,
        horarios: [],
        viable: false,
      };
      mapa.set(h.id_actividad, grupo);
    }
    grupo.horarios.push(h);
  }

  // Ordenar horarios dentro de cada grupo por día y hora
  for (const grupo of mapa.values()) {
    grupo.horarios.sort((a, b) => {
      if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
    grupo.viable = grupo.horarios.length >= requeridas;
  }

  return Array.from(mapa.values());
}

/**
 * Profesoras con horarios suficientes para completar las clases semanales del plan en AL MENOS UNA actividad.
 * Según el Estudio Inicial, cada plan corresponde a UNA única actividad: no se pueden sumar clases
 * de disciplinas distintas (ej: 1 de Pilates + 1 de Funcional para un plan de 2 días).
 */
export function profesorasDelPlan(profesoras: ProfesoraDatos[], horarios: HorarioApi[], plan: ReglasDelPlan | null): ProfesoraDatos[] {
  if (!plan) return [];
  const requeridas = clasesRequeridasDelPlan(plan);
  return profesoras.filter((profesora) => {
    const idProf = Number(profesora.id);
    const grupos = agruparHorariosPorActividad(horarios, plan, idProf);
    return grupos.some((g) => g.horarios.length >= requeridas);
  });
}

export interface ActividadDisponibleParaPlan {
  id: number;
  nombre: string;
}

/**
 * Devuelve las actividades compatibles con el plan seleccionado y los horarios disponibles.
 * - Si no hay plan seleccionado, devuelve una lista vacía.
 * - Si el plan tiene actividad exclusiva, sólo devuelve esa actividad.
 * - Si el plan es general, excluye las actividades exclusivas de otros planes y verifica
 *   que al menos una profesora (o la profesora asignada si es fija) ofrezca al menos tantas
 *   clases en días distintos como las requeridas por el plan.
 */
export function actividadesDelPlan(
  horarios: HorarioApi[],
  planes: ReglasDelPlan[],
  planActual: ReglasDelPlan | null,
  idProfesoraFija?: number | null,
): ActividadDisponibleParaPlan[] {
  if (!planActual) return [];

  // 1. Si el plan tiene actividad exclusiva, únicamente esa es válida
  if (planActual.id_actividad_exclusiva != null) {
    const horarioExclusivo = horarios.find((h) => h.id_actividad === planActual.id_actividad_exclusiva);
    if (!horarioExclusivo) return [];
    return [{ id: horarioExclusivo.id_actividad, nombre: horarioExclusivo.actividad.nombre }];
  }

  // 2. IDs de actividades exclusivas de OTROS planes (no deben mostrarse en planes generales)
  const idsExclusivasDeOtros = new Set(
    planes
      .filter((p) => p.id_actividad_exclusiva != null)
      .map((p) => p.id_actividad_exclusiva as number),
  );

  const requeridas = clasesRequeridasDelPlan(planActual);

  // 3. Agrupar horarios por actividad
  const mapaActividades = new Map<number, { id: number; nombre: string; horarios: HorarioApi[] }>();
  for (const h of horarios) {
    if (idsExclusivasDeOtros.has(h.id_actividad)) continue;
    let act = mapaActividades.get(h.id_actividad);
    if (!act) {
      act = { id: h.id_actividad, nombre: h.actividad.nombre, horarios: [] };
      mapaActividades.set(h.id_actividad, act);
    }
    act.horarios.push(h);
  }

  // 4. Filtrar actividades que tengan al menos una profesora con suficientes días distintos
  const resultado: ActividadDisponibleParaPlan[] = [];

  for (const act of mapaActividades.values()) {
    const profesoresAValidar: number[] =
      idProfesoraFija != null
        ? [idProfesoraFija]
        : Array.from(new Set(act.horarios.map((h) => h.id_profesora)));

    const tieneProfeConSuficientesDias = profesoresAValidar.some((idProf) => {
      const horariosDeProfe = act.horarios.filter((h) => h.id_profesora === idProf);
      const diasDistintos = new Set(horariosDeProfe.map((h) => h.dia_semana)).size;
      return diasDistintos >= requeridas;
    });

    if (tieneProfeConSuficientesDias) {
      resultado.push({ id: act.id, nombre: act.nombre });
    }
  }

  return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

