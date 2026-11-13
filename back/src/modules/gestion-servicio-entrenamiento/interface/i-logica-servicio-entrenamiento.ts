import type { Actividad, FiltroActividad } from "../actividad/actividad.types.js";
import type { ActualizarActividadInput, CrearActividadInput } from "../actividad/actividad.schemas.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "../horario/horario.schemas.js";
import type { FiltroHorario, HorarioConAdvertencia, HorarioRespuesta } from "../horario/horario.types.js";
import type { ActualizarPlanInput, CrearPlanInput, RegistrarPrecioInput } from "../plan/plan.schemas.js";
import type { FiltroPlan, Plan, PrecioPlan } from "../plan/plan.types.js";
import type { ActualizarParametroInput } from "../parametros-sistema/parametros-sistema.schemas.js";
import type {
  ClaveParametro,
  DatosBancarios,
  Parametro,
} from "../parametros-sistema/parametros-sistema.types.js";
import type { ActualizarPromocionInput, CrearPromocionInput } from "../promocion/promocion.schemas.js";
import type { FiltroPromociones, Promocion } from "../promocion/promocion.types.js";

// Las partes de ILogicaServicioEntrenamiento, una por componente: cada controller depende solo
// de la suya. No son interfaces nuevas del diagrama; la que provee el subsistema es la unión.

export interface ILogicaActividades {
  crearActividad(input: CrearActividadInput): Promise<Actividad>;
  listarActividades(filtro: FiltroActividad): Promise<Actividad[]>;
  obtenerActividadPorId(id: number): Promise<Actividad>;
  actualizarActividad(id: number, input: ActualizarActividadInput): Promise<Actividad>;
  darDeBajaActividad(id: number): Promise<Actividad>;
}

// US-04 y US-05: el listado y el detalle de un horario dicen cuántos alumnos tiene y cuántos
// lugares le quedan (null si no tiene cupo), para elegirlo al pre-inscribir. Sale de Inscripcion.
export type HorarioConOcupacion = HorarioRespuesta & { inscriptos: number; cupo_disponible: number | null };

export interface ILogicaHorarios {
  crearHorario(input: CrearHorarioInput): Promise<HorarioRespuesta>;
  listarHorarios(filtro: FiltroHorario): Promise<HorarioConOcupacion[]>;
  obtenerHorarioPorId(id: number): Promise<HorarioConOcupacion>;
  actualizarHorario(id: number, input: ActualizarHorarioInput): Promise<HorarioRespuesta>;
  darDeBajaHorario(id: number): Promise<HorarioConAdvertencia>;
  cancelarBajaProgramadaHorario(id: number): Promise<HorarioRespuesta>;
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

export interface ILogicaPromociones {
  listarPromociones(filtro: FiltroPromociones): Promise<Promocion[]>;
  obtenerPromocion(id: number): Promise<Promocion>;
  crearPromocion(input: CrearPromocionInput): Promise<Promocion>;
  actualizarPromocion(id: number, input: ActualizarPromocionInput): Promise<Promocion>;
  desactivarPromocion(id: number): Promise<Promocion>;
  reactivarPromocion(id: number): Promise<Promocion>;
}

// Lo que la API le pide a ParametrosSistema: ver y editar la configuración del centro (solo la
// propietaria) y dar los datos bancarios para transferir (US-16). La lectura que usan los demás
// componentes es IInfoParametros, que no pasa por acá.
export interface ILogicaParametros {
  listarParametros(): Promise<Parametro[]>;
  actualizarParametro(clave: ClaveParametro, valor: ActualizarParametroInput["valor"]): Promise<Parametro>;
  obtenerDatosBancarios(): Promise<DatosBancarios>;
}

// Interfaz del subsistema GestionServicioEntrenamiento en la vista arquitectónica.
export interface ILogicaServicioEntrenamiento
  extends ILogicaActividades, ILogicaHorarios, ILogicaPlanes, ILogicaPromociones, ILogicaParametros {}
