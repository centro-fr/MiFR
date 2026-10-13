import type { PromocionAplicable } from "../../promocion/promocion.types.js";
import type { Plan, PrecioACobrar, PrecioPlan } from "../plan.types.js";

// Interfaz provista por Plan (vista arquitectónica) para que Inscripcion y el cobro de cuotas
// consulten el plan, el precio que rige a una fecha y sus promociones sin acoplarse a su service.
export interface IInfoPlanes {
  buscarPorId(id: number): Promise<Plan | null>;
  precioVigente(idPlan: number, fecha: Date): Promise<PrecioPlan | null>;
  // US-13: la promoción activa del plan ese día, la que guarda la inscripción al pre-inscribirse.
  promocionVigente(idPlan: number, fecha: Date): Promise<PromocionAplicable | null>;
  // US-13: lo que se cobra ese día, con el descuento de la promoción de la inscripción si sigue
  // vigente. null si el plan no tiene precio ese día.
  precioACobrar(idPlan: number, fecha: Date, idPromocion: number | null): Promise<PrecioACobrar | null>;
}
