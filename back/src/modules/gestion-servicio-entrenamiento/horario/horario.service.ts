import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
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

    const horario = await this.repositorio.crear(input);
    if (!horario) throw new ConflictError("La profesora ya tiene un horario superpuesto ese día");
    return this.conCupoEfectivo(horario);
  }

  async listar(filtro: FiltroHorario): Promise<HorarioRespuesta[]> {
    const horarios = await this.repositorio.listar(filtro);
    return horarios.map((horario) => this.conCupoEfectivo(horario));
  }

  async obtenerPorId(id: number): Promise<HorarioRespuesta> {
    return this.conCupoEfectivo(await this.obtenerHorario(id));
  }

  async buscarPorIds(ids: number[]): Promise<HorarioRespuesta[]> {
    if (ids.length === 0) return [];
    const horarios = await this.repositorio.buscarPorIds(ids);
    return horarios.map((horario) => this.conCupoEfectivo(horario));
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
      throw new ValidationError("La hora de fin debe ser posterior a la hora de inicio");
    }

    const cupoMaximo = input.cupo_maximo !== undefined ? input.cupo_maximo : actual.cupo_maximo;
    this.validarCupo(actividad.modalidad, cupoMaximo ?? actividad.cupo_maximo);

    const horario = await this.repositorio.actualizar(id, input, {
      id_profesora: idProfesora,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    });
    if (!horario) throw new ConflictError("La profesora ya tiene un horario superpuesto ese día");
    return this.conCupoEfectivo(horario);
  }

  async darDeBaja(id: number): Promise<HorarioRespuesta> {
    await this.obtenerHorarioActivo(id);
    return this.conCupoEfectivo(await this.repositorio.darDeBaja(id));
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

  private validarCupo(modalidad: string, cupoMaximo: number | null): void {
    if (modalidad === "PERSONALIZADA" && cupoMaximo === null) {
      throw new ValidationError("El cupo máximo es obligatorio para la modalidad PERSONALIZADA");
    }
  }

  private conCupoEfectivo(horario: HorarioConDatos): HorarioRespuesta {
    return {
      ...horario,
      cupo_maximo_efectivo: horario.cupo_maximo ?? horario.actividad.cupo_maximo,
    };
  }
}
