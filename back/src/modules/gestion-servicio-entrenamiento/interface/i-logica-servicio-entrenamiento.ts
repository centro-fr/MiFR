import type { Actividad, FiltroActividad } from "../actividad/actividad.types.js";
import type { ActualizarActividadInput, CrearActividadInput } from "../actividad/actividad.schemas.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "../horario/horario.schemas.js";
import type { FiltroHorario, HorarioConAdvertencia, HorarioRespuesta } from "../horario/horario.types.js";

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
}
