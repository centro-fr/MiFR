import { aDatosEditables, type PlanFormValues } from "@/features/planes/schemas/plan";
import type { Actividad, ModalidadActividad } from "@/types/actividad";
import type { ActividadDelPlan, Plan, TipoPlan } from "@/types/plan";
import { normalizarParaBuscar } from "@/utils/texto";

// Lógica de la pantalla de planes (US-11). Funciones puras: se testean sin render.

export const ETIQUETA_TIPO_PLAN: Record<TipoPlan, string> = {
  MENSUAL: "Mensual",
  CLASE_SUELTA: "Clase suelta",
};

export function textoFrecuencia(tipo: TipoPlan | "", clasesPorSemana: number | null): string {
  if (tipo === "CLASE_SUELTA") return "Un solo día";
  if (clasesPorSemana === null) return "Libre (sin tope semanal)";
  return clasesPorSemana === 1 ? "1 vez por semana" : `${clasesPorSemana} veces por semana`;
}

export function textoDiasGracia(dias: number): string {
  if (dias === 0) return "Sin días de gracia";
  return dias === 1 ? "1 día de gracia" : `${dias} días de gracia`;
}

// ---------- Filtros del listado ----------

export type EstadoFiltro = "VIGENTES" | "BAJA" | "TODOS";

export interface FiltrosPlanes {
  busqueda: string;
  /** "" = todas; "NINGUNA" = los planes que sirven para cualquier actividad. */
  idActividad: string;
  modalidad: ModalidadActividad | "";
  estado: EstadoFiltro;
}

export const FILTROS_INICIALES: FiltrosPlanes = { busqueda: "", idActividad: "", modalidad: "", estado: "VIGENTES" };
export const SIN_ACTIVIDAD = "NINGUNA";

export function estaVigente(plan: Plan): boolean {
  return plan.fechaBaja === null;
}

function coincideBusqueda(plan: Plan, busqueda: string): boolean {
  const texto = normalizarParaBuscar(busqueda);
  if (texto === "") return true;
  return [plan.nombre, plan.actividad?.nombre ?? ""].some((valor) => normalizarParaBuscar(valor).includes(texto));
}

function coincideActividad(plan: Plan, idActividad: string): boolean {
  if (idActividad === "") return true;
  if (idActividad === SIN_ACTIVIDAD) return plan.actividad === null;
  return plan.actividad?.id === idActividad;
}

function coincideEstado(plan: Plan, estado: EstadoFiltro): boolean {
  if (estado === "TODOS") return true;
  return estado === "VIGENTES" ? estaVigente(plan) : !estaVigente(plan);
}

export function filtrarPlanes(planes: Plan[], filtros: FiltrosPlanes): Plan[] {
  return planes.filter(
    (plan) =>
      coincideBusqueda(plan, filtros.busqueda) &&
      coincideActividad(plan, filtros.idActividad) &&
      (filtros.modalidad === "" || plan.actividad?.modalidad === filtros.modalidad) &&
      coincideEstado(plan, filtros.estado),
  );
}

export function hayFiltrosActivos(filtros: FiltrosPlanes): boolean {
  return filtros.busqueda.trim() !== "" || filtros.idActividad !== "" || filtros.estado !== "VIGENTES";
}

/** Las actividades que aparecen en algún plan, para el filtro, sin repetir y por nombre. */
export function actividadesDeLosPlanes(planes: Plan[]): ActividadDelPlan[] {
  const porId = new Map(planes.flatMap((plan) => (plan.actividad ? [[plan.actividad.id, plan.actividad] as const] : [])));
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Otro plan vigente con el mismo nombre: el back lo rechaza con 409, acá se avisa antes. */
export function nombreRepetido(planes: Plan[], nombre: string, idPropio?: string): boolean {
  const buscado = normalizarParaBuscar(nombre);
  return buscado !== "" && planes.some((plan) => estaVigente(plan) && plan.id !== idPropio && normalizarParaBuscar(plan.nombre) === buscado);
}

// ---------- Cambios sin guardar (vista previa de la edición) ----------

export interface CambioDelPlan {
  campo: string;
  antes: string;
  despues: string;
}

function nombreActividad(id: number | null, actividades: Actividad[], actual: ActividadDelPlan | null): string {
  if (id === null) return "Cualquier actividad";
  if (actual && actual.id === String(id)) return actual.nombre;
  return actividades.find((actividad) => actividad.id === String(id))?.nombre ?? "—";
}

/** Lo que va a cambiar al guardar, en palabras, para la vista previa y la confirmación. */
export function cambiosDelPlan(plan: Plan, valores: PlanFormValues, actividades: Actividad[]): CambioDelPlan[] {
  const despues = aDatosEditables(valores);
  const idActividadAntes = plan.actividad ? Number(plan.actividad.id) : null;
  const cambios: CambioDelPlan[] = [];
  const sumar = (cambio: boolean, campo: string, antes: string, ahora: string) => {
    if (cambio) cambios.push({ campo, antes, despues: ahora });
  };
  sumar(despues.nombre !== plan.nombre, "Nombre", plan.nombre, despues.nombre);
  sumar(despues.descripcion !== plan.descripcion, "Descripción", plan.descripcion ? "Anterior" : "Sin descripción", despues.descripcion ? "Editada" : "Sin descripción");
  sumar(
    despues.id_actividad_exclusiva !== idActividadAntes,
    "Actividad",
    nombreActividad(idActividadAntes, actividades, plan.actividad),
    nombreActividad(despues.id_actividad_exclusiva, actividades, plan.actividad),
  );
  sumar(despues.profesora_unica !== plan.profesoraUnica, "Profesora", textoProfesora(plan.profesoraUnica), textoProfesora(despues.profesora_unica));
  sumar(
    despues.clases_por_semana !== plan.clasesPorSemana,
    "Frecuencia",
    textoFrecuencia(plan.tipo, plan.clasesPorSemana),
    textoFrecuencia(plan.tipo, despues.clases_por_semana),
  );
  sumar(despues.dias_gracia !== plan.diasGracia, "Días de gracia", String(plan.diasGracia), String(despues.dias_gracia));
  return cambios;
}

// El back siempre exige que todos los horarios sean de una misma profesora (validarHorarios en
// inscripcion.service.ts); profesora_unica solo agrega que sea la que está a cargo del alumno.
export function textoProfesora(profesoraUnica: boolean): string {
  return profesoraUnica ? "La profesora a cargo" : "Puede ser otra profesora";
}
