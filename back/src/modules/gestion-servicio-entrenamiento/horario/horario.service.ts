import { ConflictError, NotFoundError } from "../../../shared/errors/app-error.js";
import type { IInfoActividades } from "../actividad/interface/i-info-actividades.js";
import type { IInfoProfesores } from "../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { ActualizarHorarioInput, CrearHorarioInput } from "./horario.schemas.js";
import type { HorarioRepository } from "./horario.repository.js";
import type {
  FiltroHorario,
  HorarioConAdvertencia,
  HorarioConDatos,
  HorarioRespuesta,
} from "./horario.types.js";
import type { IInfoHorarios } from "./interface/i-info-horarios.js";

function horaComoTexto(valor: Date): string {
  return `${String(valor.getUTCHours()).padStart(2, "0")}:${String(valor.getUTCMinutes()).padStart(2, "0")}`;
}

export class HorarioService implements IInfoHorarios {
  constructor(
    private readonly repositorio: HorarioRepository,
    private readonly actividades: IInfoActividades,
    private readonly profesoras: IInfoProfesores,
  ) {}

  async crear(input: CrearHorarioInput): Promise<HorarioRespuesta> {
    const actividad = await this.obtenerActividadActiva(input.id_actividad);
    await this.obtenerProfesoraActiva(input.id_profesora);
    this.validarCupo(actividad.modalidad, input.cupo_maximo ?? actividad.cupo_maximo);
    await this.validarSuperposicion(input.id_profesora, input.dia_semana, input.hora_inicio, input.hora_fin);

    return this.conCupoEfectivo(await this.repositorio.crear(input));
  }

  async listar(filtro: FiltroHorario): Promise<HorarioRespuesta[]> {
    const horarios = await this.repositorio.listar(filtro);
    return horarios.map((horario) => this.conCupoEfectivo(horario));
  }

  async obtenerPorId(id: number): Promise<HorarioRespuesta> {
    return this.conCupoEfectivo(await this.obtenerHorario(id));
  }

  async actualizar(id: number, input: ActualizarHorarioInput): Promise<HorarioRespuesta> {
    const actual = await this.obtenerHorarioActivo(id);
    const idActividad = input.id_actividad ?? actual.id_actividad;
    const idProfesora = input.id_profesora ?? actual.id_profesora;
    const diaSemana = input.dia_semana ?? actual.dia_semana;
    const horaInicio = input.hora_inicio ?? horaComoTexto(actual.hora_inicio);
    const horaFin = input.hora_fin ?? horaComoTexto(actual.hora_fin);
    const actividad = await this.obtenerActividadActiva(idActividad);
    await this.obtenerProfesoraActiva(idProfesora);

    if (horaFin <= horaInicio) {
      throw new ConflictError("La hora de fin debe ser posterior a la hora de inicio");
    }

    const cupoMaximo = input.cupo_maximo !== undefined ? input.cupo_maximo : actual.cupo_maximo;
    this.validarCupo(actividad.modalidad, cupoMaximo ?? actividad.cupo_maximo);
    await this.validarSuperposicion(idProfesora, diaSemana, horaInicio, horaFin, id);

    return this.conCupoEfectivo(await this.repositorio.actualizar(id, input));
  }

  async darDeBaja(id: number): Promise<HorarioConAdvertencia> {
    await this.obtenerHorarioActivo(id);
    return {
      horario: this.conCupoEfectivo(await this.repositorio.darDeBaja(id)),
      advertencia:
        "No se verificaron inscripciones futuras; el módulo de inscripciones aún no está disponible.",
    };
  }

  tieneActivosDeActividad(idActividad: number): Promise<boolean> {
    return this.repositorio.tieneActivosDeActividad(idActividad);
  }

  tieneActivosDeProfesora(idProfesora: number): Promise<boolean> {
    return this.repositorio.tieneActivosDeProfesora(idProfesora);
  }

  private async obtenerActividadActiva(id: number) {
    const actividad = await this.actividades.buscarPorId(id);
    if (!actividad || !actividad.activo) throw new NotFoundError("Actividad no encontrada o inactiva");
    return actividad;
  }

  private async obtenerProfesoraActiva(id: number) {
    const profesora = await this.profesoras.buscarPorId(id);
    if (!profesora) throw new NotFoundError("Profesora no encontrada, inactiva o sin el rol PROFESORA");
    return profesora;
  }

  private async obtenerHorario(id: number): Promise<HorarioConDatos> {
    const horario = await this.repositorio.buscarPorId(id);
    if (!horario) throw new NotFoundError("Horario no encontrado");
    return horario;
  }

  private async obtenerHorarioActivo(id: number): Promise<HorarioConDatos> {
    const horario = await this.obtenerHorario(id);
    if (horario.fecha_baja !== null) throw new ConflictError("El horario ya está dado de baja");
    return horario;
  }

  private async validarSuperposicion(
    idProfesora: number,
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    excluirId?: number,
  ): Promise<void> {
    const existente = await this.repositorio.buscarSuperposicion(
      idProfesora,
      diaSemana,
      horaInicio,
      horaFin,
      excluirId,
    );
    if (existente) throw new ConflictError("La profesora ya tiene un horario superpuesto ese día");
  }

  private validarCupo(modalidad: string, cupoMaximo: number | null): void {
    if (modalidad === "PERSONALIZADA" && cupoMaximo === null) {
      throw new ConflictError("El cupo máximo es obligatorio para la modalidad PERSONALIZADA");
    }
  }

  private conCupoEfectivo(horario: HorarioConDatos): HorarioRespuesta {
    return {
      ...horario,
      cupo_maximo_efectivo: horario.cupo_maximo ?? horario.actividad.cupo_maximo,
    };
  }
}
