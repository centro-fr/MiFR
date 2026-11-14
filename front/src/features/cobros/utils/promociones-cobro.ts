import type { Promocion } from "@/types/promocion";

// Valor del selector de descuento cuando no se aplica ninguna promoción.
export const SIN_PROMOCION = "SIN_PROMOCION";

/** El id de la promoción elegida en el selector, o undefined si es "Sin promoción". */
export function idDePromocion(seleccionada: string): number | undefined {
  return seleccionada === SIN_PROMOCION ? undefined : Number(seleccionada);
}

/** Promociones vigentes para el plan, más la ya elegida aunque haya dejado de estarlo. */
export function promocionesAplicables(promociones: Promocion[], idPlan: number | undefined, seleccionada: string): Promocion[] {
  return promociones.filter((promocion) => {
    if (seleccionada !== SIN_PROMOCION && String(promocion.id) === seleccionada) return true;
    if (!promocion.activo || promocion.estado !== "ACTIVA") return false;
    if (!idPlan || !promocion.planes || promocion.planes.length === 0) return true;
    return promocion.planes.some((plan) => plan.id === String(idPlan));
  });
}
