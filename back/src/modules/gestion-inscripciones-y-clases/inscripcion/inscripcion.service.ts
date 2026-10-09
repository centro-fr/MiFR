import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { IInfoAlumnos } from "../../gestion-personas/alumno/interface/i-info-alumnos.js";
import type { IInfoProfesores } from "../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
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
  InscripcionConDatos,
  ResumenInscripcionAlumno,
} from "./inscripcion.types.js";

const ESTADOS_VIGENTES: EstadoInscripcion[] = ["PREINSCRIPTA", "ACTIVA"];

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

export class InscripcionService implements IInfoInscripciones {
  constructor(
    private readonly repositorio: InscripcionRepository,
    private readonly alumnos: IInfoAlumnos,
    private readonly planes: IInfoPlanes,
    private readonly horarios: IInfoHorarios,
    private readonly profesoras: IInfoProfesores,
  ) {}

  async crear(input: CrearInscripcionInput): Promise<InscripcionConDatos> {
    const datos = await this.prepararInscripcion({ ...input, estado: "PREINSCRIPTA" });
    const resultado = await this.repositorio.crear(datos, input.ids_horarios, fechaActualArgentina());
    return this.resolverResultado(resultado);
  }

  // US-10: la profesora solo ve las inscripciones que tiene a cargo; la propietaria, todas.
  async listar(filtro: FiltroInscripciones, solicitante: Solicitante): Promise<InscripcionConDatos[]> {
    if (solicitante.esPropietaria) return this.repositorio.listar(filtro);

    const profesora = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    if (!profesora) return [];
    if (filtro.id_profesora !== undefined && filtro.id_profesora !== profesora.id_profesora) return [];
    return this.repositorio.listar({ ...filtro, id_profesora: profesora.id_profesora });
  }

  async obtenerPara(id: number, solicitante: Solicitante): Promise<InscripcionConDatos> {
    const inscripcion = await this.obtenerPorId(id);
    if (solicitante.esPropietaria) return inscripcion;

    const profesora = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    if (profesora?.id_profesora !== inscripcion.id_profesora) {
      throw new ForbiddenError("Solo puede ver las inscripciones que tiene a cargo");
    }
    return inscripcion;
  }

  async obtenerPorId(id: number): Promise<InscripcionConDatos> {
    const inscripcion = await this.repositorio.buscarPorId(id);
    if (!inscripcion) throw new NotFoundError("Inscripción no encontrada");
    return inscripcion;
  }

  buscarPorId(id: number): Promise<InscripcionConDatos | null> {
    return this.repositorio.buscarPorId(id);
  }

  listarVigentesDeAlumno(idAlumno: number): Promise<InscripcionConDatos[]> {
    return this.repositorio.listarVigentesPorAlumno(idAlumno);
  }

  async activar(id: number): Promise<InscripcionConDatos> {
    const actual = await this.obtenerPorId(id);
    if (actual.estado === "BAJA") throw new ConflictError("No se puede activar una inscripción dada de baja");
    if (actual.estado === "ACTIVA") {
      await this.alumnos.activar(actual.id_alumno);
      return actual;
    }

    const resultado = await this.repositorio.activar(id);
    const inscripcion = this.resolverResultado(resultado);
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
      return existente;
    }
    if (existente) {
      throw new ConflictError("El alumno dado de baja ya tiene una pre-inscripción vigente");
    }

    const datos = await this.prepararInscripcion(
      {
        ...input,
        id_alumno: idAlumno,
        estado: "ACTIVA",
      },
      true,
    );
    const resultado = await this.repositorio.reactivar(datos, input.ids_horarios, fechaActualArgentina());
    const inscripcion = this.resolverResultado(resultado);
    const alumnoActual = await this.alumnos.buscarPorId(idAlumno);
    if (alumnoActual?.estado === "BAJA") await this.alumnos.reactivar(idAlumno);
    return inscripcion;
  }

  async cambiarPlan(id: number, input: CambiarPlanInput): Promise<InscripcionConDatos> {
    const actual = await this.obtenerInscripcionVigente(id);
    if (actual.id_plan === input.id_plan) {
      throw new ConflictError("La inscripción ya tiene el plan seleccionado");
    }
    const nuevoPlan = await this.prepararInscripcion({
      ...input,
      id_alumno: actual.id_alumno,
      estado: actual.estado === "ACTIVA" ? "ACTIVA" : "PREINSCRIPTA",
    });
    const resultado = await this.repositorio.cambiarPlan(
      actual,
      input,
      nuevoPlan.id_plan_precio,
      this.fechasDeBaja(),
    );
    return this.resolverResultado(resultado);
  }

  async actualizarHorarios(id: number, input: ActualizarHorariosInput): Promise<InscripcionConDatos> {
    const actual = await this.obtenerInscripcionVigente(id);
    await this.validarHorarios(actual.plan, actual.id_profesora, input.ids_horarios);
    const resultado = await this.repositorio.actualizarHorarios(actual, input, fechaActualArgentina());
    return this.resolverResultado(resultado);
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

  private async obtenerInscripcionVigente(id: number): Promise<InscripcionConDatos> {
    const inscripcion = await this.obtenerPorId(id);
    if (!ESTADOS_VIGENTES.includes(inscripcion.estado)) {
      throw new ConflictError("La inscripción ya está dada de baja");
    }
    return inscripcion;
  }

  private async prepararInscripcion(
    input: DatosDeInscripcion,
    permitirAlumnoDeBaja = false,
  ): Promise<DatosPreparados> {
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
    await this.validarHorarios(plan, input.id_profesora, input.ids_horarios);

    return { ...input, fecha_inicio: fechaInicio, id_plan_precio: precio.id_plan_precio };
  }

  private fechasDeBaja(): FechasDeBaja {
    return { instante: new Date(), dia: fechaActualArgentina() };
  }

  private async validarHorarios(
    plan: ReglasDelPlan,
    idProfesora: number,
    idsHorarios: number[],
  ): Promise<void> {
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
  }

  private resolverResultado(
    resultado: Awaited<ReturnType<InscripcionRepository["activar"]>>,
  ): InscripcionConDatos {
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
