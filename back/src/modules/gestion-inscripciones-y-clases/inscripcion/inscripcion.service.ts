import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import type { IUnidadDeTrabajo } from "../../../shared/db/transaccion.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { IInfoAlumnos } from "../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoProfesores } from "../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { IInfoProgreso } from "../../gestion-rutinas-y-progreso/registro-progreso/interface/i-info-progreso.js";
import type { HorarioRespuesta } from "../../gestion-servicio-entrenamiento/horario/horario.types.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoPlanes } from "../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type { Plan } from "../../gestion-servicio-entrenamiento/plan/plan.types.js";
import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
  ReactivarAlumnoInput,
} from "./inscripcion.schemas.js";
import type { InscripcionRepository } from "./inscripcion.repository.js";
import type { IInfoInscripciones } from "./interface/i-info-inscripciones.js";
import type {
  FechasDeBaja,
  FiltroAlumnosPorInscripcion,
  EstadoInscripcion,
  FiltroInscripciones,
  InscripcionACobrar,
  InscripcionConDatos,
  InscripcionGuardada,
  ResumenInscripcionAlumno,
} from "./inscripcion.types.js";

const ESTADOS_VIGENTES: EstadoInscripcion[] = ["PREINSCRIPTA", "ACTIVA"];
const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

type ReglasDelPlan = Pick<Plan, "tipo" | "clases_por_semana" | "profesora_unica" | "id_actividad_exclusiva">;

interface DatosDeInscripcion {
  id_alumno: number;
  id_plan: number;
  id_profesora: number;
  ids_horarios: number[];
  sin_cargo: boolean;
  fecha_inicio?: Date;
  fecha_fin_estimado?: Date | null;
  observaciones?: string | null;
  estado: "PREINSCRIPTA" | "ACTIVA";
}

type DatosPreparados = Omit<DatosDeInscripcion, "ids_horarios" | "fecha_inicio"> & {
  fecha_inicio: Date;
  id_plan_precio: number;
};

interface InscripcionPreparada {
  datos: DatosPreparados;
  horarios: HorarioRespuesta[];
}

// US-05: si alguna actividad de los horarios elegidos pide peso y talla, la pre-inscripción sin ellos
// no se guarda. Si llegan sin que nadie los pida, se guardan igual.
function verificarMedidas(horarios: HorarioRespuesta[], medidas: CrearInscripcionInput["medidas"]): void {
  const queLasPide = horarios.find(({ actividad }) => actividad.requiere_medidas);
  if (queLasPide && !medidas) {
    throw new ValidationError(`${queLasPide.actividad.nombre} pide el peso y la talla para pre-inscribir`);
  }
}

// hoy y los días de DIAS_RESERVA_PREINSCRIPCION, leídos una vez por operación.
interface PlazoDeReserva {
  hoy: Date;
  dias: number;
}

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * UN_DIA_EN_MS);
}

// La pre-inscripción más vieja que todavía guarda su lugar es la que empezó hace DIAS_RESERVA_PREINSCRIPCION días.
function inicioDeReservasVigentes({ hoy, dias }: PlazoDeReserva): Date {
  return sumarDias(hoy, -dias);
}

function conReserva(inscripcion: InscripcionGuardada, { hoy, dias }: PlazoDeReserva): InscripcionConDatos {
  if (inscripcion.estado !== "PREINSCRIPTA") return { ...inscripcion, reserva: null };
  const vence = sumarDias(inscripcion.fecha_inicio, dias);
  return { ...inscripcion, reserva: { vence, vencida: vence < hoy } };
}

export class InscripcionService implements IInfoInscripciones {
  constructor(
    private readonly repositorio: InscripcionRepository,
    private readonly alumnos: IInfoAlumnos,
    private readonly planes: IInfoPlanes,
    private readonly horarios: IInfoHorarios,
    private readonly profesoras: IInfoProfesores,
    private readonly progreso: IInfoProgreso,
    private readonly parametros: IInfoParametros,
    private readonly unidadDeTrabajo: IUnidadDeTrabajo,
  ) {}

  // La inscripción y la medición inicial van juntas: sin cupo no queda una medición suelta.
  async crear(input: CrearInscripcionInput, solicitante: Solicitante): Promise<InscripcionConDatos> {
    if (!solicitante.esPropietaria) await this.verificarQuePuedePreinscribir(input, solicitante);
    const { medidas, ...datosDeInscripcion } = input;
    const { datos, horarios } = await this.prepararInscripcion({
      ...datosDeInscripcion,
      estado: "PREINSCRIPTA",
    });
    verificarMedidas(horarios, medidas);
    const plazo = await this.plazoDeReserva();

    return this.unidadDeTrabajo.ejecutar(async () => {
      const resultado = await this.repositorio.crear(
        datos,
        input.ids_horarios,
        plazo.hoy,
        inicioDeReservasVigentes(plazo),
      );
      const inscripcion = conReserva(this.resolverResultado(resultado), plazo);
      if (medidas) {
        await this.progreso.registrarMedicionInicial({
          idAlumno: datos.id_alumno,
          idProfesora: datos.id_profesora,
          pesoKg: medidas.peso_kg,
          tallaCm: medidas.talla_cm,
        });
      }
      return inscripcion;
    });
  }

  // Una inscripción vigente deja al alumno "a cargo" de la profesora, que desde ahí ve y edita su ficha
  // (US-10). Por eso una profesora solo preinscribe a su nombre, alumnos que no están con otra profesora,
  // y sin bonificar: si no, con preinscribirse alcanzaba para ver los datos de cualquier alumno.
  private async verificarQuePuedePreinscribir(
    input: CrearInscripcionInput,
    solicitante: Solicitante,
  ): Promise<void> {
    const profesora = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    if (profesora?.id_profesora !== input.id_profesora) {
      throw new ForbiddenError("Solo puede preinscribir alumnos a su propio cargo");
    }
    if (input.sin_cargo) throw new ForbiddenError("Solo la propietaria puede dar una inscripción sin cargo");

    const vigentes = await this.repositorio.listarVigentesPorAlumno(input.id_alumno);
    if (vigentes.some((vigente) => vigente.id_profesora !== profesora.id_profesora)) {
      throw new ForbiddenError("El alumno está a cargo de otra profesora: lo inscribe la propietaria");
    }
  }

  // US-10: la profesora solo ve las inscripciones que tiene a cargo; la propietaria, todas.
  async listar(filtro: FiltroInscripciones, solicitante: Solicitante): Promise<InscripcionConDatos[]> {
    if (solicitante.esPropietaria) return this.conReservas(await this.repositorio.listar(filtro));

    const profesora = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    if (!profesora) return [];
    if (filtro.id_profesora !== undefined && filtro.id_profesora !== profesora.id_profesora) return [];
    return this.conReservas(
      await this.repositorio.listar({ ...filtro, id_profesora: profesora.id_profesora }),
    );
  }

  async obtenerPara(id: number, solicitante: Solicitante): Promise<InscripcionConDatos> {
    const inscripcion = await this.obtenerPorId(id);
    if (!solicitante.esPropietaria) {
      const profesora = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
      if (profesora?.id_profesora !== inscripcion.id_profesora) {
        throw new ForbiddenError("Solo puede ver las inscripciones que tiene a cargo");
      }
    }
    return conReserva(inscripcion, await this.plazoDeReserva());
  }

  async obtenerPorId(id: number): Promise<InscripcionGuardada> {
    const inscripcion = await this.repositorio.buscarPorId(id);
    if (!inscripcion) throw new NotFoundError("Inscripción no encontrada");
    return inscripcion;
  }

  buscarParaCobro(id: number): Promise<InscripcionACobrar | null> {
    return this.repositorio.buscarParaCobro(id);
  }

  async listarVigentesDeAlumno(idAlumno: number): Promise<InscripcionConDatos[]> {
    return this.conReservas(await this.repositorio.listarVigentesPorAlumno(idAlumno));
  }

  async activar(id: number): Promise<InscripcionConDatos> {
    const actual = await this.obtenerPorId(id);
    if (actual.estado === "BAJA") throw new ConflictError("No se puede activar una inscripción dada de baja");
    // El alta es la del primer pago (US-07): con la inscripción ya activa no se vuelve a tocar al alumno ni a
    // su tutor, para no reactivar una cuenta que la propietaria haya desactivado después.
    if (actual.estado === "ACTIVA") return { ...actual, reserva: null };

    // Con la reserva vencida el lugar pudo quedar para otro: el alta vuelve a pedir cupo (US-07).
    const plazo = await this.plazoDeReserva();
    const resultado = await this.repositorio.activar(id, inicioDeReservasVigentes(plazo));
    const inscripcion = conReserva(this.resolverResultado(resultado), plazo);
    await this.alumnos.activar(inscripcion.id_alumno);
    return inscripcion;
  }

  async darDeBajaAlumno(idAlumno: number, input: DarDeBajaAlumnoInput): Promise<void> {
    const alumno = await this.alumnos.buscarPorId(idAlumno);
    if (!alumno) throw new NotFoundError("Alumno no encontrado");
    if (alumno.estado === "BAJA") throw new ConflictError("El alumno ya está dado de baja");

    await this.repositorio.darDeBajaAlumno(idAlumno, input, this.fechasDeBaja());
    await this.alumnos.darDeBaja(idAlumno);
  }

  async reactivarAlumno(idAlumno: number, input: ReactivarAlumnoInput): Promise<InscripcionConDatos> {
    const alumno = await this.alumnos.buscarPorId(idAlumno);
    if (!alumno) throw new NotFoundError("Alumno no encontrado");
    if (alumno.estado !== "BAJA") throw new ConflictError("Solo se puede reactivar un alumno dado de baja");

    const existente = await this.repositorio.buscarVigentePorAlumno(idAlumno);
    if (existente?.estado === "ACTIVA") {
      await this.alumnos.reactivar(idAlumno);
      return { ...existente, reserva: null };
    }
    if (existente) {
      throw new ConflictError("El alumno dado de baja ya tiene una pre-inscripción vigente");
    }

    const { datos } = await this.prepararInscripcion(
      {
        ...input,
        id_alumno: idAlumno,
        estado: "ACTIVA",
      },
      true,
    );
    const plazo = await this.plazoDeReserva();
    const resultado = await this.repositorio.reactivar(
      datos,
      input.ids_horarios,
      plazo.hoy,
      inicioDeReservasVigentes(plazo),
    );
    const inscripcion = conReserva(this.resolverResultado(resultado), plazo);
    const alumnoActual = await this.alumnos.buscarPorId(idAlumno);
    if (alumnoActual?.estado === "BAJA") await this.alumnos.reactivar(idAlumno);
    return inscripcion;
  }

  async cambiarPlan(id: number, input: CambiarPlanInput): Promise<InscripcionConDatos> {
    const actual = await this.obtenerInscripcionVigente(id);
    if (actual.id_plan === input.id_plan) {
      throw new ConflictError("La inscripción ya tiene el plan seleccionado");
    }
    const { datos: nuevoPlan } = await this.prepararInscripcion({
      ...input,
      id_alumno: actual.id_alumno,
      estado: actual.estado === "ACTIVA" ? "ACTIVA" : "PREINSCRIPTA",
    });
    const plazo = await this.plazoDeReserva();
    const resultado = await this.repositorio.cambiarPlan(
      actual,
      input,
      nuevoPlan.id_plan_precio,
      this.fechasDeBaja(),
      inicioDeReservasVigentes(plazo),
    );
    return conReserva(this.resolverResultado(resultado), plazo);
  }

  async actualizarHorarios(id: number, input: ActualizarHorariosInput): Promise<InscripcionConDatos> {
    const actual = await this.obtenerInscripcionVigente(id);
    await this.validarHorarios(actual.plan, actual.id_profesora, input.ids_horarios);
    const plazo = await this.plazoDeReserva();
    const resultado = await this.repositorio.actualizarHorarios(
      actual,
      input,
      plazo.hoy,
      inicioDeReservasVigentes(plazo),
    );
    return conReserva(this.resolverResultado(resultado), plazo);
  }

  obtenerIdsDeAlumnos(filtro: FiltroAlumnosPorInscripcion): Promise<number[]> {
    return this.repositorio.obtenerIdsDeAlumnos(filtro);
  }

  resumirInscripcionesVigentes(idsAlumnos: number[]): Promise<ResumenInscripcionAlumno[]> {
    return this.repositorio.resumirInscripcionesVigentes(idsAlumnos);
  }

  contarInscriptosVigentes(idsHorarios: number[]): Promise<Map<number, number>> {
    return this.repositorio.contarInscriptosVigentes(idsHorarios);
  }

  async contarLugaresOcupados(idsHorarios: number[]): Promise<Map<number, number>> {
    const plazo = await this.plazoDeReserva();
    return this.repositorio.contarLugaresOcupados(idsHorarios, inicioDeReservasVigentes(plazo));
  }

  private async plazoDeReserva(): Promise<PlazoDeReserva> {
    return {
      hoy: fechaActualArgentina(),
      dias: await this.parametros.obtener("DIAS_RESERVA_PREINSCRIPCION"),
    };
  }

  private async conReservas(inscripciones: InscripcionGuardada[]): Promise<InscripcionConDatos[]> {
    const plazo = await this.plazoDeReserva();
    return inscripciones.map((inscripcion) => conReserva(inscripcion, plazo));
  }

  private async obtenerInscripcionVigente(id: number): Promise<InscripcionGuardada> {
    const inscripcion = await this.obtenerPorId(id);
    if (!ESTADOS_VIGENTES.includes(inscripcion.estado)) {
      throw new ConflictError("La inscripción ya está dada de baja");
    }
    return inscripcion;
  }

  private async prepararInscripcion(
    input: DatosDeInscripcion,
    permitirAlumnoDeBaja = false,
  ): Promise<InscripcionPreparada> {
    const alumno = await this.alumnos.buscarPorId(input.id_alumno);
    if (!alumno || (alumno.estado === "BAJA" && !permitirAlumnoDeBaja)) {
      throw new NotFoundError("Alumno inexistente o dado de baja");
    }

    const plan = await this.planes.buscarPorId(input.id_plan);
    if (!plan || plan.fecha_baja) throw new ConflictError("El plan no existe o está dado de baja");
    const hoy = fechaActualArgentina();
    const fechaInicio = input.fecha_inicio ?? hoy;
    if (fechaInicio < hoy) {
      throw new ValidationError("La fecha de inicio no puede ser anterior a hoy");
    }
    if (input.fecha_fin_estimado && input.fecha_fin_estimado <= fechaInicio) {
      throw new ValidationError("La fecha estimada de fin debe ser posterior al inicio");
    }
    const precio = await this.planes.precioVigente(input.id_plan, hoy);
    if (!precio) throw new ConflictError("El plan no tiene un precio vigente hoy");
    const horarios = await this.validarHorarios(plan, input.id_profesora, input.ids_horarios);

    return {
      datos: { ...input, fecha_inicio: fechaInicio, id_plan_precio: precio.id_plan_precio },
      horarios,
    };
  }

  private fechasDeBaja(): FechasDeBaja {
    return { instante: new Date(), dia: fechaActualArgentina() };
  }

  private async validarHorarios(
    plan: ReglasDelPlan,
    idProfesora: number,
    idsHorarios: number[],
  ): Promise<HorarioRespuesta[]> {
    const [profesora, horarios] = await Promise.all([
      this.profesoras.buscarPorId(idProfesora),
      this.horarios.buscarPorIds(idsHorarios),
    ]);
    if (!profesora) throw new NotFoundError("Profesora no encontrada, inactiva o sin el rol PROFESORA");
    if (horarios.length !== idsHorarios.length || horarios.some(({ fecha_baja }) => fecha_baja !== null)) {
      throw new ConflictError("Uno o más horarios no existen o están dados de baja");
    }
    if (new Set(horarios.map(({ id_profesora }) => id_profesora)).size > 1) {
      throw new ValidationError("Todos los horarios deben pertenecer a una misma profesora");
    }
    if (plan.profesora_unica && horarios.some(({ id_profesora: asignada }) => asignada !== idProfesora)) {
      throw new ValidationError("El plan exige que los horarios sean de la profesora a cargo");
    }
    if (horarios.some(({ actividad }) => !actividad.activo)) {
      throw new ConflictError("Uno o más horarios pertenecen a una actividad dada de baja");
    }
    if (
      plan.id_actividad_exclusiva !== null &&
      horarios.some(({ id_actividad }) => id_actividad !== plan.id_actividad_exclusiva)
    ) {
      throw new ValidationError("Los horarios deben corresponder a la actividad exclusiva del plan");
    }
    // Un mensual sin clases_por_semana es un pase libre: no tiene tope de horarios.
    if (plan.clases_por_semana !== null && idsHorarios.length > plan.clases_por_semana) {
      throw new ValidationError("La cantidad de horarios supera las clases por semana del plan");
    }
    return horarios;
  }

  private resolverResultado(
    resultado: Awaited<ReturnType<InscripcionRepository["activar"]>>,
  ): InscripcionGuardada {
    if (resultado.resultado === "ok") return resultado.inscripcion;
    if (resultado.resultado === "sin-cupo") {
      throw new ConflictError("No hay cupo disponible en uno o más horarios");
    }
    if (resultado.resultado === "plan-duplicado") {
      throw new ConflictError("El alumno ya tiene una inscripción vigente para ese plan");
    }
    throw new ConflictError("La inscripción dejó de estar vigente");
  }
}
