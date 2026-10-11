import { ConflictError } from "../../shared/errors/app-error.js";
import type {
  HorarioConOcupacion,
  ILogicaServicioEntrenamiento,
} from "./interface/i-logica-servicio-entrenamiento.js";
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

  // US-03: la baja de la actividad da de baja también sus horarios, salvo que alguno tenga alumnos
  // inscriptos: a esos hay que reubicarlos antes (US-04). Tampoco se da de baja si tiene planes
  // vigentes exclusivos (US-11): quedarían ofrecidos sin horarios donde inscribir. Actividad no conoce
  // a Horario, Plan ni Inscripcion en la vista arquitectónica, así que el subsistema es quien los cruza.
  async darDeBajaActividad(id: number): Promise<Actividad> {
    await this.actividades.obtenerPorId(id);
    const planesExclusivos = await this.planes.listar({ id_actividad_exclusiva: id });
    if (planesExclusivos.length > 0) {
      const nombres = planesExclusivos.map(({ nombre }) => nombre).join(", ");
      throw new ConflictError(
        `La actividad tiene planes vigentes que son solo de ella (${nombres}): ` +
          "dalos de baja o pasalos a otra actividad antes de darla de baja",
      );
    }
    const horarios = await this.horarios.listar({ id_actividad: id });
    const inscriptos = await this.inscripciones.contarInscriptosVigentes(
      horarios.map(({ id_horario }) => id_horario),
    );
    const conAlumnos = horarios.filter(({ id_horario }) => (inscriptos.get(id_horario) ?? 0) > 0);
    if (conAlumnos.length > 0) {
      throw new ConflictError(
        `La actividad tiene ${conAlumnos.length} horario(s) con alumnos inscriptos: hay que reubicarlos antes de darla de baja`,
      );
    }
    await this.horarios.darDeBajaDeActividad(id);
    return this.actividades.darDeBaja(id);
  }

  crearHorario(input: CrearHorarioInput): Promise<HorarioRespuesta> {
    return this.horarios.crear(input);
  }

  async listarHorarios(filtro: FiltroHorario): Promise<HorarioConOcupacion[]> {
    return this.conOcupacion(await this.horarios.listar(filtro));
  }

  async obtenerHorarioPorId(id: number): Promise<HorarioConOcupacion> {
    const [horario] = await this.conOcupacion([await this.horarios.obtenerPorId(id)]);
    return horario;
  }

  actualizarHorario(id: number, input: ActualizarHorarioInput): Promise<HorarioRespuesta> {
    return this.horarios.actualizar(id, input);
  }

  // US-04: un horario con alumnos inscriptos no se da de baja; primero hay que reubicarlos.
  // Horario no conoce a Inscripcion, así que el cruce lo hace el subsistema. La advertencia queda
  // en la respuesta porque el front ya la muestra.
  async darDeBajaHorario(id: number): Promise<HorarioConAdvertencia> {
    const inscriptos = (await this.inscripciones.contarInscriptosVigentes([id])).get(id) ?? 0;
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

  // Horario no conoce a Inscripcion: los lugares ocupados los cuenta el subsistema, en una consulta, con
  // la misma regla del cupo que usa el alta (las reservas vencidas no ocupan lugar).
  private async conOcupacion(horarios: HorarioRespuesta[]): Promise<HorarioConOcupacion[]> {
    const inscriptosPorHorario = await this.inscripciones.contarLugaresOcupados(
      horarios.map(({ id_horario }) => id_horario),
    );
    return horarios.map((horario) => {
      const inscriptos = inscriptosPorHorario.get(horario.id_horario) ?? 0;
      const cupo = horario.cupo_maximo_efectivo;
      return {
        ...horario,
        inscriptos,
        cupo_disponible: cupo === null ? null : Math.max(cupo - inscriptos, 0),
      };
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
