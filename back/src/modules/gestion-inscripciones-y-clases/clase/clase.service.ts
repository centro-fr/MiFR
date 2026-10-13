import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { IInfoProfesores } from "../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { HorarioRespuesta } from "../../gestion-servicio-entrenamiento/horario/horario.types.js";
import type { IInfoHorarios } from "../../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { ClaseConDatos, ClaseSuplida, EstadoClase } from "./clase.types.js";
import type { ClaseRepository } from "./clase.repository.js";
import type { IInfoClases } from "./interface/i-info-clases.js";

// Componente Clase de la vista arquitectónica. Las clases no las genera un proceso programado: se
// materializan desde los horarios del día cuando alguien las pide (decisión de SPRINT-3.md).
export class ClaseService implements IInfoClases {
  constructor(
    private readonly repositorio: ClaseRepository,
    private readonly horarios: IInfoHorarios,
    private readonly profesores: IInfoProfesores,
  ) {}

  // Otro día que no sea hoy lo pide solo la propietaria, para corregir (la ruta lo exige).
  async materializarDelDia(solicitante: Solicitante, fecha: Date = fechaActualArgentina()): Promise<void> {
    const idProfesora = await this.idProfesoraSegun(solicitante);
    if (idProfesora === null) return;
    const horarios = await this.horarios.listarActivosDelDia(fecha);
    const propios = horarios.filter(
      (horario) => idProfesora === undefined || horario.id_profesora === idProfesora,
    );
    await this.repositorio.crearDelDia(propios, fecha);
  }

  async listarDelDia(
    solicitante: Solicitante,
    fecha: Date = fechaActualArgentina(),
  ): Promise<ClaseConDatos[]> {
    const idProfesora = await this.idProfesoraSegun(solicitante);
    if (idProfesora === null) return [];
    return this.repositorio.listarPorFecha(fecha, idProfesora);
  }

  // US-20: la profesora toma asistencia solo de las clases que dicta hoy; las de otros días
  // quedan para la corrección de la propietaria.
  async obtenerPara(idClase: number, solicitante: Solicitante): Promise<ClaseConDatos> {
    const clase = await this.repositorio.buscarPorId(idClase);
    if (!clase) throw new NotFoundError("Clase no encontrada");
    if (solicitante.esPropietaria) return clase;

    const idProfesora = await this.idProfesoraSegun(solicitante);
    const esHoy = clase.fecha_clase.getTime() === fechaActualArgentina().getTime();
    if (clase.id_prof_dictante !== idProfesora || !esHoy) throw new NotFoundError("Clase no encontrada");
    return clase;
  }

  // Un ciclo de tres estados no justifica State (patrones.md): alcanza con este control.
  async bloquearParaMarcar(idClase: number, solicitante: Solicitante): Promise<void> {
    const estado = await this.repositorio.bloquear(idClase);
    if (estado === null) throw new NotFoundError("Clase no encontrada");
    if (estado === "CANCELADA") throw new ConflictError("La clase está cancelada");
    if (estado === "DICTADA" && !solicitante.esPropietaria) {
      throw new ConflictError("La asistencia de la clase está cerrada: solo la propietaria la corrige");
    }
  }

  // Toma el bloqueo de la clase en la transacción en curso, como el marcado, y devuelve su estado:
  // una marca y la cancelación no pueden cruzarse. Una clase dictada ya no se cancela.
  async bloquearParaCancelar(idClase: number): Promise<EstadoClase> {
    const estado = await this.repositorio.bloquear(idClase);
    if (estado === null) throw new NotFoundError("Clase no encontrada");
    if (estado === "DICTADA") throw new ConflictError("La clase ya se dictó: no se puede cancelar");
    return estado;
  }

  // PROGRAMADA → CANCELADA (estados_clase.puml). Una cancelada no admite marcas ni genera faltas.
  async cancelar(idClase: number): Promise<void> {
    await this.repositorio.cancelar(idClase);
  }

  listarAbiertasHasta(fecha: Date): Promise<ClaseConDatos[]> {
    return this.repositorio.listarAbiertasHasta(fecha);
  }

  cerrar(idClase: number, fechaCierre: Date): Promise<ClaseConDatos | null> {
    return this.repositorio.cerrar(idClase, fechaCierre);
  }

  // US-24: una suplencia puede ser de cualquier día, así que la clase se materializa para esa fecha y
  // no solo para hoy. Si ya existía, queda como estaba: el único (id_horario, fecha_clase) no la duplica.
  async materializar(idHorario: number, fecha: Date): Promise<ClaseConDatos> {
    const [horario] = await this.horarios.buscarPorIds([idHorario]);
    if (!horario) throw new NotFoundError("Horario no encontrado");
    if ((fecha.getUTCDay() || 7) !== horario.dia_semana) {
      throw new ValidationError("La fecha no corresponde al día de la semana del horario");
    }
    if (!estabaVigente(horario, fecha)) throw new ConflictError("El horario no estaba vigente en esa fecha");

    await this.repositorio.crearDelDia([horario], fecha);
    const clase = await this.repositorio.buscarPorHorarioYFecha(idHorario, fecha);
    if (!clase) throw new Error(`La clase del horario ${idHorario} no quedó creada`);
    return clase;
  }

  async bloquearParaSuplencia(idClase: number): Promise<ClaseConDatos> {
    const estado = await this.repositorio.bloquear(idClase);
    if (estado === null) throw new NotFoundError("Clase no encontrada");
    if (estado === "CANCELADA") throw new ConflictError("La clase está cancelada: no tiene suplencia");
    const clase = await this.repositorio.buscarPorId(idClase);
    if (!clase) throw new Error(`La clase ${idClase} bloqueada no se encontró`);
    return clase;
  }

  cambiarDictante(idClase: number, idProfesora: number): Promise<void> {
    return this.repositorio.cambiarDictante(idClase, idProfesora);
  }

  listarSuplidasEnPeriodo(desde: Date, hasta: Date): Promise<ClaseSuplida[]> {
    return this.repositorio.listarSuplidasEnPeriodo(desde, hasta);
  }

  // undefined: la propietaria, que ve todas. null: quien no es una profesora activa, que no ve ninguna.
  private async idProfesoraSegun(solicitante: Solicitante): Promise<number | null | undefined> {
    if (solicitante.esPropietaria) return undefined;
    const profesora = await this.profesores.buscarPorUsuario(solicitante.idUsuario);
    return profesora?.id_profesora ?? null;
  }
}

// El día de la baja el horario ya no se dicta.
function estabaVigente(horario: Pick<HorarioRespuesta, "fecha_alta" | "fecha_baja">, fecha: Date): boolean {
  if (fecha < horario.fecha_alta) return false;
  return horario.fecha_baja === null || fecha < horario.fecha_baja;
}
