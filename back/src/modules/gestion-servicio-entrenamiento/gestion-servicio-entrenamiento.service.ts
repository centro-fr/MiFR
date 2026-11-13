import { ConflictError, ValidationError } from "../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../shared/utils/fecha-argentina.js";
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
import type { ParametrosSistemaService } from "./parametros-sistema/parametros-sistema.service.js";
import type { ActualizarParametroInput } from "./parametros-sistema/parametros-sistema.schemas.js";
import type { PromocionService } from "./promocion/promocion.service.js";
import type { ActualizarPromocionInput, CrearPromocionInput } from "./promocion/promocion.schemas.js";
import type { FiltroPromociones, Promocion, TipoDescuento } from "./promocion/promocion.types.js";
import type {
  ClaveParametro,
  DatosBancarios,
  Parametro,
} from "./parametros-sistema/parametros-sistema.types.js";
import type { IInfoInscripciones } from "../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";

// Realiza ILogicaServicioEntrenamiento
export class GestionServicioEntrenamientoService implements ILogicaServicioEntrenamiento {
  constructor(
    private readonly actividades: ActividadService,
    private readonly horarios: HorarioService,
    private readonly planes: PlanService,
    private readonly parametros: ParametrosSistemaService,
    private readonly inscripciones: IInfoInscripciones,
    private readonly promociones: PromocionService,
  ) {}

  listarPromociones(filtro: FiltroPromociones): Promise<Promocion[]> {
    return this.promociones.listar(filtro);
  }

  obtenerPromocion(id: number): Promise<Promocion> {
    return this.promociones.obtenerPorId(id);
  }

  async crearPromocion(input: CrearPromocionInput): Promise<Promocion> {
    await this.validarPlanesDePromocion(input);
    return this.promociones.crear(input);
  }

  // Los planes y el monto fijo se revisan con lo que queda después del cambio.
  async actualizarPromocion(id: number, input: ActualizarPromocionInput): Promise<Promocion> {
    const actual = await this.promociones.obtenerPorId(id);
    await this.validarPlanesDePromocion({
      ids_planes: input.ids_planes ?? actual.planes.map(({ id_plan }) => id_plan),
      tipo_descuento: input.tipo_descuento ?? actual.tipo_descuento,
      valor: input.valor ?? actual.valor,
      fecha_desde: input.fecha_desde ?? actual.fecha_desde,
    });
    return this.promociones.actualizar(id, input);
  }

  desactivarPromocion(id: number): Promise<Promocion> {
    return this.promociones.desactivar(id);
  }

  reactivarPromocion(id: number): Promise<Promocion> {
    return this.promociones.reactivar(id);
  }

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

  // US-04: con alumnos inscriptos no se cambia el día, la hora, la profesora ni la actividad: los
  // alumnos pagaron ese horario. Se programa su baja y se crea otro. El cupo sí se puede cambiar.
  async actualizarHorario(id: number, input: ActualizarHorarioInput): Promise<HorarioRespuesta> {
    const cambiaLaClase = (
      ["dia_semana", "hora_inicio", "hora_fin", "id_profesora", "id_actividad"] as const
    ).some((campo) => input[campo] !== undefined);
    if (cambiaLaClase && (await this.inscriptosDe(id)) > 0) {
      throw new ConflictError(
        "El horario tiene alumnos inscriptos: no se cambia el día, la hora, la profesora ni la actividad. Programá su baja y creá otro",
      );
    }
    return this.horarios.actualizar(id, input);
  }

  // US-04: un horario con alumnos inscriptos no se da de baja en el momento: queda programada, no
  // admite alumnos nuevos y cada inscripto sale al terminar su gracia (proceso AplicadorProgramados).
  // Horario no conoce a Inscripcion, así que el cruce lo hace el subsistema.
  async darDeBajaHorario(id: number): Promise<HorarioConAdvertencia> {
    const inscriptos = await this.inscriptosDe(id);
    if (inscriptos > 0) {
      return {
        horario: await this.horarios.programarBaja(id, fechaActualArgentina()),
        advertencia:
          `Tiene ${inscriptos} ${inscriptos === 1 ? "alumno inscripto" : "alumnos inscriptos"}: no admite alumnos nuevos ` +
          "y cada uno sale al terminar su período de gracia. Se da de baja cuando sale el último.",
      };
    }
    return {
      horario: await this.horarios.darDeBaja(id),
      advertencia: "El horario no tenía alumnos inscriptos.",
    };
  }

  cancelarBajaProgramadaHorario(id: number): Promise<HorarioRespuesta> {
    return this.horarios.cancelarBajaProgramada(id);
  }

  private async inscriptosDe(idHorario: number): Promise<number> {
    return (await this.inscripciones.contarInscriptosVigentes([idHorario])).get(idHorario) ?? 0;
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

  listarParametros(): Promise<Parametro[]> {
    return this.parametros.listar();
  }

  actualizarParametro(clave: ClaveParametro, valor: ActualizarParametroInput["valor"]): Promise<Parametro> {
    return this.parametros.actualizar(clave, valor);
  }

  obtenerDatosBancarios(): Promise<DatosBancarios> {
    return this.parametros.obtenerDatosBancarios();
  }

  private async validarPlanesDePromocion(datos: {
    ids_planes: number[];
    tipo_descuento: TipoDescuento;
    valor: number;
    fecha_desde: Date;
  }): Promise<void> {
    const planes = await Promise.all(datos.ids_planes.map((id) => this.planes.buscarPorId(id)));
    const ausente = datos.ids_planes.find((_, indice) => !planes[indice] || planes[indice]?.fecha_baja);
    if (ausente !== undefined) throw new ValidationError(`El plan ${ausente} no existe o está dado de baja`);
    if (datos.tipo_descuento !== "MONTO_FIJO") return;

    const precios = await Promise.all(
      datos.ids_planes.map((id) => this.planes.precioVigente(id, datos.fecha_desde)),
    );
    datos.ids_planes.forEach((id, indice) => {
      const precio = precios[indice];
      if (!precio) {
        throw new ValidationError(`El plan ${id} no tiene un precio vigente al empezar la promoción`);
      }
      if (datos.valor >= precio.precio) {
        throw new ValidationError(
          `El descuento tiene que ser menor que el precio del plan ${id} (${precio.precio})`,
        );
      }
    });
  }
}
