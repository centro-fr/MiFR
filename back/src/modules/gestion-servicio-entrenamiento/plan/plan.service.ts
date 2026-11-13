import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { IInfoActividades } from "../actividad/interface/i-info-actividades.js";
import type { IInfoPromociones } from "../promocion/interface/i-info-promociones.js";
import type { PromocionAplicable } from "../promocion/promocion.types.js";
import type { IInfoPlanes } from "./interface/i-info-planes.js";
import type { PlanRepository } from "./plan.repository.js";
import {
  respetaReglaClaseSuelta,
  type ActualizarPlanInput,
  type CrearPlanInput,
  type RegistrarPrecioInput,
} from "./plan.schemas.js";
import type { FiltroPlan, Plan, PrecioACobrar, PrecioPlan } from "./plan.types.js";

// Componente "Plan" de la vista arquitectónica: la oferta comercial (US-11) y sus precios con
// vigencia (US-12). Según el DER el plan no tiene profesora: se elige al inscribir.
export class PlanService implements IInfoPlanes {
  constructor(
    private readonly repositorio: PlanRepository,
    private readonly actividades: IInfoActividades,
    private readonly promociones: IInfoPromociones,
  ) {}

  async crear(input: CrearPlanInput): Promise<Plan> {
    if (input.id_actividad_exclusiva != null) {
      await this.validarActividadExclusiva(input.id_actividad_exclusiva);
    }
    await this.validarNombreLibre(input.nombre);
    return this.repositorio.crear(input);
  }

  listar(filtro: FiltroPlan): Promise<Plan[]> {
    return this.repositorio.listar(filtro);
  }

  listarVigentes(filtro?: { id_actividad_exclusiva?: number }): Promise<Plan[]> {
    return this.repositorio.listar({
      incluirBajas: false,
      id_actividad_exclusiva: filtro?.id_actividad_exclusiva,
    });
  }

  async obtenerPorId(id: number): Promise<Plan> {
    const plan = await this.repositorio.buscarPorId(id);
    if (!plan) throw new NotFoundError("Plan no encontrado");
    return plan;
  }

  buscarPorId(id: number): Promise<Plan | null> {
    return this.repositorio.buscarPorId(id);
  }

  async actualizar(id: number, input: ActualizarPlanInput): Promise<Plan> {
    const { reactivar, ...campos } = input;
    const plan = reactivar ? await this.obtenerPorId(id) : await this.obtenerVigente(id);
    if (reactivar && !plan.fecha_baja) {
      throw new ConflictError("El plan no está dado de baja");
    }

    const resultante = {
      tipo: plan.tipo,
      clases_por_semana:
        campos.clases_por_semana !== undefined ? campos.clases_por_semana : plan.clases_por_semana,
      dias_gracia: campos.dias_gracia ?? plan.dias_gracia,
    };
    if (!respetaReglaClaseSuelta(resultante)) {
      throw new ValidationError("Un plan CLASE_SUELTA no lleva clases por semana y sus días de gracia son 0");
    }
    const idActividad =
      campos.id_actividad_exclusiva !== undefined
        ? campos.id_actividad_exclusiva
        : reactivar
          ? plan.id_actividad_exclusiva
          : undefined;
    if (idActividad != null) {
      await this.validarActividadExclusiva(idActividad);
    }
    const nombreValidar = campos.nombre ?? (reactivar ? plan.nombre : undefined);
    if (nombreValidar) {
      await this.validarNombreLibre(nombreValidar, id);
    }
    return this.repositorio.actualizar(id, {
      ...campos,
      ...(reactivar ? { fecha_baja: null } : {}),
    });
  }

  // Un plan nunca se borra (US-11): las inscripciones que ya tiene lo siguen usando.
  async darDeBaja(id: number): Promise<Plan> {
    const plan = await this.obtenerPorId(id);
    if (plan.fecha_baja) throw new ConflictError("El plan ya está dado de baja");
    return this.repositorio.darDeBaja(id);
  }

  async listarPrecios(id: number): Promise<PrecioPlan[]> {
    await this.obtenerPorId(id);
    return this.repositorio.listarPrecios(id);
  }

  // US-12: el precio nuevo rige desde su fecha; lo ya cobrado guarda el precio con el que se
  // cobró, así que nunca se modifica en forma retroactiva.
  async registrarPrecio(id: number, input: RegistrarPrecioInput): Promise<PrecioPlan> {
    const plan = await this.obtenerPorId(id);
    if (plan.fecha_baja) throw new ConflictError("El plan está dado de baja");
    if (input.fecha_vigencia_desde < fechaActualArgentina()) {
      throw new ValidationError("La fecha de vigencia no puede ser anterior a hoy");
    }

    const precio = await this.repositorio.registrarPrecio(id, input);
    if (!precio) {
      throw new ConflictError("El plan ya tiene un precio que empezó a regir hoy");
    }
    return precio;
  }

  precioVigente(idPlan: number, fecha: Date): Promise<PrecioPlan | null> {
    return this.repositorio.precioVigente(idPlan, fecha);
  }

  promocionVigente(idPlan: number, fecha: Date): Promise<PromocionAplicable | null> {
    return this.promociones.vigenteParaPlan(idPlan, fecha);
  }

  // US-13: el descuento se calcula sobre el precio de lista de ese día; lo ya cobrado no cambia.
  async precioACobrar(
    idPlan: number,
    fecha: Date,
    idPromocion: number | null,
  ): Promise<PrecioACobrar | null> {
    const precio = await this.repositorio.precioVigente(idPlan, fecha);
    if (!precio) return null;
    const aplicada =
      idPromocion === null
        ? null
        : await this.promociones.descuentoAplicable(idPromocion, idPlan, fecha, precio.precio);
    const descuento = aplicada?.descuento ?? 0;
    return {
      id_plan_precio: precio.id_plan_precio,
      precio_lista: precio.precio,
      descuento,
      monto: Math.round((precio.precio - descuento) * 100) / 100,
      promocion: aplicada && {
        id_promocion: aplicada.id_promocion,
        nombre: aplicada.nombre,
      },
    };
  }

  private async obtenerVigente(id: number): Promise<Plan> {
    const plan = await this.obtenerPorId(id);
    if (plan.fecha_baja) throw new NotFoundError("Plan no encontrado o dado de baja");
    return plan;
  }

  private async validarActividadExclusiva(idActividad: number): Promise<void> {
    const actividad = await this.actividades.buscarPorId(idActividad);
    if (!actividad?.activo) {
      throw new ValidationError("La actividad exclusiva no existe o está dada de baja");
    }
  }

  private async validarNombreLibre(nombre: string, excluirId?: number): Promise<void> {
    if (await this.repositorio.existeVigenteConNombre(nombre, excluirId)) {
      throw new ConflictError("Ya existe un plan vigente con ese nombre");
    }
  }
}
