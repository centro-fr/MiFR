import { ConflictError } from "../../shared/errors/app-error.js";
import type { ILogicaServicioEntrenamiento } from "./interface/i-logica-servicio-entrenamiento.js";
import type { ActividadService } from "./actividad/actividad.service.js";
import type { ActualizarActividadInput, CrearActividadInput } from "./actividad/actividad.schemas.js";
import type { Actividad, FiltroActividad } from "./actividad/actividad.types.js";
import type { HorarioService } from "./horario/horario.service.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "./horario/horario.schemas.js";
import type { FiltroHorario, HorarioConAdvertencia, HorarioRespuesta } from "./horario/horario.types.js";
import type { PlanService } from "./plan/plan.service.js";
import type { ActualizarPlanInput, CrearPlanInput, RegistrarPrecioInput } from "./plan/plan.schemas.js";
import type { FiltroPlan, Plan, PrecioPlan } from "./plan/plan.types.js";
import type { IInfoInscripciones } from "../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";

// Realiza ILogicaServicioEntrenamiento
export class GestionServicioEntrenamientoService implements ILogicaServicioEntrenamiento {
  constructor(
    private readonly actividades: ActividadService,
    private readonly horarios: HorarioService,
    private readonly planes: PlanService,
    private readonly inscripciones: IInfoInscripciones,
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

  // US-03 / CA-03: la baja solo procede sin horarios activos. Actividad no conoce a Horario en
  // la vista arquitectónica, así que el subsistema es quien cruza los dos componentes.
  async darDeBajaActividad(id: number): Promise<Actividad> {
    if (await this.horarios.tieneActivosDeActividad(id)) {
      throw new ConflictError(
        "La actividad tiene horarios activos: hay que darlos de baja antes que la actividad",
      );
    }
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
    return this.horarios.darDeBaja(id).then(async (horario) => {
      const cantidad = await this.inscripciones.contarInscriptosVigentesEnHorario(id);
      const advertencia =
        cantidad > 0
          ? `El horario tiene ${cantidad} inscripción(es) vigente(s); reubicarlas antes de continuar.`
          : "El horario no tiene alumnos inscriptos.";
      return { horario, advertencia };
    });
  }

  crearPlan(input: CrearPlanInput): Promise<Plan> {
    return this.planes.crear(input);
  }

  listarPlanes(filtro: FiltroPlan): Promise<Plan[]> {
    return this.planes.listar(filtro);
  }

  obtenerPlanPorId(id: number): Promise<Plan> {
    return this.planes.obtenerPorId(id);
  }

  actualizarPlan(id: number, input: ActualizarPlanInput): Promise<Plan> {
    return this.planes.actualizar(id, input);
  }

  darDeBajaPlan(id: number): Promise<Plan> {
    return this.planes.darDeBaja(id);
  }

  listarPreciosPlan(id: number): Promise<PrecioPlan[]> {
    return this.planes.listarPrecios(id);
  }

  registrarPrecioPlan(id: number, input: RegistrarPrecioInput): Promise<PrecioPlan> {
    return this.planes.registrarPrecio(id, input);
  }
}
