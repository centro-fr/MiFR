import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import type { ActividadRepository } from "./actividad.repository.js";
import type { ActualizarActividadInput, CrearActividadInput } from "./actividad.schemas.js";
import type { Actividad, FiltroActividad } from "./actividad.types.js";
import type { IInfoActividades } from "./interface/i-info-actividades.js";

export class ActividadService implements IInfoActividades {
  constructor(private readonly repositorio: ActividadRepository) {}

  async crear(input: CrearActividadInput): Promise<Actividad> {
    const existente = await this.repositorio.buscarPorCodigo(input.codigo);
    if (existente) {
      throw new ConflictError("Ya existe una actividad con ese código");
    }

    return this.repositorio.crear(input);
  }

  async listar(filtro: FiltroActividad): Promise<Actividad[]> {
    return this.repositorio.listar(filtro);
  }

  async obtenerPorId(id: number): Promise<Actividad> {
    const actividad = await this.repositorio.buscarPorId(id);
    if (!actividad) {
      throw new NotFoundError("Actividad no encontrada");
    }
    return actividad;
  }

  buscarPorId(id: number): Promise<Actividad | null> {
    return this.repositorio.buscarPorId(id);
  }

  async actualizar(id: number, input: ActualizarActividadInput): Promise<Actividad> {
    const actividad = await this.obtenerPorId(id);
    if (!actividad.activo) {
      throw new NotFoundError("Actividad no encontrada o inactiva");
    }

    const nuevaModalidad = input.modalidad ?? actividad.modalidad;
    const nuevoCupo = input.cupo_maximo !== undefined ? input.cupo_maximo : actividad.cupo_maximo;

    if (nuevaModalidad === "PERSONALIZADA" && nuevoCupo == null) {
      throw new ValidationError("El cupo máximo es obligatorio para la modalidad PERSONALIZADA");
    }

    return this.repositorio.actualizar(id, input);
  }

  async darDeBaja(id: number): Promise<Actividad> {
    const actividad = await this.obtenerPorId(id);
    if (!actividad.activo) {
      throw new ConflictError("La actividad ya está dada de baja");
    }

    return this.repositorio.bajaLogica(id);
  }
}
