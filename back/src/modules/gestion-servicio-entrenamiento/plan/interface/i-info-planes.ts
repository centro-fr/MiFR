import type { Plan, PrecioPlan } from "../plan.types.js";

// Interfaz provista por Plan (vista arquitectónica) para que Inscripcion y, más adelante, el cobro
// de cuotas consulten el plan y el precio que rige a una fecha sin acoplarse a su service.
export interface IInfoPlanes {
  buscarPorId(id: number): Promise<Plan | null>;
  precioVigente(idPlan: number, fecha: Date): Promise<PrecioPlan | null>;
}
