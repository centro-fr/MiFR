import type { DescuentoAplicado, PromocionAplicable } from "../promocion.types.js";

// Interfaz provista por Promocion (GestionServicioEntrenamiento) para Plan, que realiza la
// dependencia Plan ..> Promocion de la vista arquitectónica. Los demás la ven a través de IInfoPlanes.
export interface IInfoPromociones {
  // La promoción activa del plan ese día (vigencia inclusiva en los dos extremos), o null.
  vigenteParaPlan(idPlan: number, fecha: Date): Promise<PromocionAplicable | null>;
  // El descuento de esa promoción sobre el precio, si ese día sigue activa, vigente y con el plan; si
  // no, null. Nunca deja el monto negativo (ck_cuotas_x2).
  descuentoAplicable(
    idPromocion: number,
    idPlan: number,
    fecha: Date,
    precio: number,
  ): Promise<DescuentoAplicado | null>;
}
