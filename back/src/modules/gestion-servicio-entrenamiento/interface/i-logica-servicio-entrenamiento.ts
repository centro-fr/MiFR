import type { Actividad, FiltroActividad } from "../actividad/actividad.types.js";
import type { ActualizarActividadInput, CrearActividadInput } from "../actividad/actividad.schemas.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "../horario/horario.schemas.js";
import type { FiltroHorario, HorarioConAdvertencia, HorarioRespuesta } from "../horario/horario.types.js";
import type { ActualizarPlanInput, CrearPlanInput, RegistrarPrecioInput } from "../plan/plan.schemas.js";
import type { FiltroPlan, Plan, PrecioPlan } from "../plan/plan.types.js";

// Las partes de ILogicaServicioEntrenamiento, una por componente: cada controller depende solo
// de la suya. No son interfaces nuevas del diagrama; la que provee el subsistema es la unión.

export interface ILogicaActividades {
  crearActividad(input: CrearActividadInput): Promise<Actividad>;
  listarActividades(filtro: FiltroActividad): Promise<Actividad[]>;
  obtenerActividadPorId(id: number): Promise<Actividad>;
  actualizarActividad(id: number, input: ActualizarActividadInput): Promise<Actividad>;
  darDeBajaActividad(id: number): Promise<Actividad>;
}

export interface ILogicaHorarios {
  crearHorario(input: CrearHorarioInput): Promise<HorarioRespuesta>;
  listarHorarios(filtro: FiltroHorario): Promise<HorarioRespuesta[]>;
  obtenerHorarioPorId(id: number): Promise<HorarioRespuesta>;
  actualizarHorario(id: number, input: ActualizarHorarioInput): Promise<HorarioRespuesta>;
  darDeBajaHorario(id: number): Promise<HorarioConAdvertencia>;
}

export interface ILogicaPlanes {
  crearPlan(input: CrearPlanInput): Promise<Plan>;
  listarPlanes(filtro: FiltroPlan): Promise<Plan[]>;
  obtenerPlanPorId(id: number): Promise<Plan>;
  actualizarPlan(id: number, input: ActualizarPlanInput): Promise<Plan>;
  darDeBajaPlan(id: number): Promise<Plan>;
  listarPreciosPlan(id: number): Promise<PrecioPlan[]>;
  registrarPrecioPlan(id: number, input: RegistrarPrecioInput): Promise<PrecioPlan>;
}

// Interfaz del subsistema GestionServicioEntrenamiento en la vista arquitectónica.
export interface ILogicaServicioEntrenamiento extends ILogicaActividades, ILogicaHorarios, ILogicaPlanes {}
