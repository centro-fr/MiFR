import type { Actividad, FiltroActividad } from "../actividad/actividad.types.js";
import type { ActualizarActividadInput, CrearActividadInput } from "../actividad/actividad.schemas.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "../horario/horario.schemas.js";
import type { FiltroHorario, HorarioConAdvertencia, HorarioRespuesta } from "../horario/horario.types.js";
import type { ActualizarPlanInput, CrearPlanInput, RegistrarPrecioInput } from "../plan/plan.schemas.js";
import type { FiltroPlan, Plan, PrecioPlan } from "../plan/plan.types.js";

export interface ILogicaServicioEntrenamiento {
  crearActividad(input: CrearActividadInput): Promise<Actividad>;
  listarActividades(filtro: FiltroActividad): Promise<Actividad[]>;
  obtenerActividadPorId(id: number): Promise<Actividad>;
  actualizarActividad(id: number, input: ActualizarActividadInput): Promise<Actividad>;
  darDeBajaActividad(id: number): Promise<Actividad>;
  crearHorario(input: CrearHorarioInput): Promise<HorarioRespuesta>;
  listarHorarios(filtro: FiltroHorario): Promise<HorarioRespuesta[]>;
  obtenerHorarioPorId(id: number): Promise<HorarioRespuesta>;
  actualizarHorario(id: number, input: ActualizarHorarioInput): Promise<HorarioRespuesta>;
  darDeBajaHorario(id: number): Promise<HorarioConAdvertencia>;
  crearPlan(input: CrearPlanInput): Promise<Plan>;
  listarPlanes(filtro: FiltroPlan): Promise<Plan[]>;
  obtenerPlanPorId(id: number): Promise<Plan>;
  actualizarPlan(id: number, input: ActualizarPlanInput): Promise<Plan>;
  darDeBajaPlan(id: number): Promise<Plan>;
  listarPreciosPlan(id: number): Promise<PrecioPlan[]>;
  registrarPrecioPlan(id: number, input: RegistrarPrecioInput): Promise<PrecioPlan>;
}
