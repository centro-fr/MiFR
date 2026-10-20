import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { RegistrarTarifaInput } from "./tarifa-honorario.schemas.js";
import type { TarifaHonorarioRepository } from "./tarifa-honorario.repository.js";
import type { FiltroTarifa, TarifaHonorario } from "./tarifa-honorario.types.js";

// Solo lo que el service necesita de los otros módulos.
export interface ProfesoraLookup {
  buscarPorId(id: number): Promise<unknown | null>;
}
export interface PlanLookup {
  buscarPorId(id: number): Promise<unknown | null>;
}

export class TarifaHonorarioService {
  constructor(
    private readonly repositorio: TarifaHonorarioRepository,
    private readonly profesoras: ProfesoraLookup,
    private readonly planes: PlanLookup,
  ) {}

  listar(filtro: FiltroTarifa): Promise<TarifaHonorario[]> {
    return this.repositorio.listar(filtro);
  }

  async obtener(id: number): Promise<TarifaHonorario> {
    const tarifa = await this.repositorio.buscarPorId(id);
    if (!tarifa) throw new NotFoundError("La tarifa no existe");
    return tarifa;
  }

  async registrar(input: RegistrarTarifaInput): Promise<TarifaHonorario> {
    if (input.fecha_vigencia_desde < fechaActualArgentina()) {
      throw new ValidationError("La vigencia no puede empezar en el pasado");
    }
    if (!(await this.profesoras.buscarPorId(input.id_profesora))) {
      throw new ValidationError(`La profesora ${input.id_profesora} no existe`);
    }
    if (input.id_plan !== null && !(await this.planes.buscarPorId(input.id_plan))) {
      throw new ValidationError(`El plan ${input.id_plan} no existe`);
    }

    const tarifa = await this.repositorio.registrar(input);
    if (!tarifa) {
      throw new ConflictError(
        "Hay una tarifa programada en uso por una liquidación que empieza en esa fecha o después",
      );
    }
    return tarifa;
  }

  async cerrar(id: number, fechaHasta: Date): Promise<TarifaHonorario> {
    const tarifa = await this.obtener(id);
    if (fechaHasta < fechaActualArgentina()) {
      throw new ValidationError("El cierre no puede quedar en el pasado");
    }
    if (fechaHasta < tarifa.fecha_vigencia_desde) {
      throw new ValidationError("El cierre no puede ser anterior al inicio de la vigencia");
    }
    return this.repositorio.cerrar(id, fechaHasta);
  }
}