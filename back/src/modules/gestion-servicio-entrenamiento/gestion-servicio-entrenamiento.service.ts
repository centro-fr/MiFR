import type { ILogicaServicioEntrenamiento } from "./interface/i-logica-servicio-entrenamiento.js";
import type { ActividadService } from "./actividad/actividad.service.js";
import type { ActualizarActividadInput, CrearActividadInput } from "./actividad/actividad.schemas.js";
import type { Actividad, ActividadConAdvertencia, FiltroActividad } from "./actividad/actividad.types.js";
import type { HorarioService } from "./horario/horario.service.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "./horario/horario.schemas.js";
import type { FiltroHorario, HorarioConAdvertencia, HorarioRespuesta } from "./horario/horario.types.js";

// Realiza ILogicaServicioEntrenamiento
export class GestionServicioEntrenamientoService implements ILogicaServicioEntrenamiento {
  constructor(
    private readonly actividades: ActividadService,
    private readonly horarios: HorarioService,
  ) {}

  crearActividad(input: CrearActividadInput): Promise<Actividad> {
    return this.actividades.crear(input);
  }

  listarActividades(filtro: FiltroActividad): Promise<Actividad[]> {
    return this.actividades.listar(filtro);
  }

  obtenerActividadPorId(id: number): Promise<Actividad> {
    return this.actividades.obtenerPorId(id);
  }

  actualizarActividad(id: number, input: ActualizarActividadInput): Promise<Actividad> {
    return this.actividades.actualizar(id, input);
  }

  darDeBajaActividad(id: number): Promise<ActividadConAdvertencia> {
    return this.actividades.darDeBaja(id);
  }

  crearHorario(input: CrearHorarioInput): Promise<HorarioRespuesta> {
    return this.horarios.crear(input);
  }

  listarHorarios(filtro: FiltroHorario): Promise<HorarioRespuesta[]> {
    return this.horarios.listar(filtro);
  }

  obtenerHorarioPorId(id: number): Promise<HorarioRespuesta> {
    return this.horarios.obtenerPorId(id);
  }

  actualizarHorario(id: number, input: ActualizarHorarioInput): Promise<HorarioRespuesta> {
    return this.horarios.actualizar(id, input);
  }

  darDeBajaHorario(id: number): Promise<HorarioConAdvertencia> {
    return this.horarios.darDeBaja(id);
  }
}
