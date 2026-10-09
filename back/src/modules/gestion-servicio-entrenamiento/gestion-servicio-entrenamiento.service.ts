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

  // US-04: un horario con alumnos inscriptos no se da de baja; primero hay que reubicarlos.
  // Horario no conoce a Inscripcion, así que el cruce lo hace el subsistema. La advertencia queda
  // en la respuesta porque el front ya la muestra.
  async darDeBajaHorario(id: number): Promise<HorarioConAdvertencia> {
    const inscriptos = await this.inscripciones.contarInscriptosVigentesEnHorario(id);
    if (inscriptos > 0) {
      throw new ConflictError(
        `El horario tiene ${inscriptos} alumno(s) inscripto(s): hay que reubicarlos antes de darlo de baja`,
      );
    }
    return {
      horario: await this.horarios.darDeBaja(id),
      advertencia: "El horario no tenía alumnos inscriptos.",
    };
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
