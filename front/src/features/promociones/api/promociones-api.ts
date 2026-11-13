import { z } from "zod";
import { apiClient } from "@/api/client";
import { promocionApiSchema, type PromocionBody } from "@/features/promociones/schemas/promocion";
import type { Promocion } from "@/types/promocion";

function aPromocion(api: z.infer<typeof promocionApiSchema>): Promocion {
  return {
    id: String(api.id_promocion),
    codigo: api.codigo,
    nombre: api.nombre,
    tipoDescuento: api.tipo_descuento,
    valor: api.valor,
    fechaDesde: api.fecha_desde,
    fechaHasta: api.fecha_hasta,
    activo: api.activo,
    planes: api.planes.map((plan) => ({ id: String(plan.id_plan), nombre: plan.nombre })),
    estado: api.estado,
  };
}

export async function listarPromociones(): Promise<Promocion[]> {
  const { data } = await apiClient.get("/promociones", { params: { limit: 100, offset: 0 } });
  return z.array(promocionApiSchema).parse(data).map(aPromocion);
}

export async function crearPromocion(cuerpo: PromocionBody): Promise<Promocion> {
  const { data } = await apiClient.post("/promociones", cuerpo);
  return aPromocion(promocionApiSchema.parse(data));
}

export async function actualizarPromocion(id: string, cambios: Partial<PromocionBody>): Promise<Promocion> {
  const { data } = await apiClient.patch(`/promociones/${encodeURIComponent(id)}`, cambios);
  return aPromocion(promocionApiSchema.parse(data));
}

export async function desactivarPromocion(id: string): Promise<Promocion> {
  const { data } = await apiClient.post(`/promociones/${encodeURIComponent(id)}/desactivar`);
  return aPromocion(promocionApiSchema.parse(data));
}

export async function reactivarPromocion(id: string): Promise<Promocion> {
  const { data } = await apiClient.post(`/promociones/${encodeURIComponent(id)}/reactivar`);
  return aPromocion(promocionApiSchema.parse(data));
}
