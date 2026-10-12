import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  planApiSchema,
  precioHistorialApiSchema,
  type ActualizarPlanBody,
  type CrearPlanBody,
  type PlanApi,
  type RegistrarPrecioBody,
} from "@/features/planes/schemas/plan";
import type { Plan, PrecioPlanHistorial } from "@/types/plan";

export function aPlan(api: PlanApi): Plan {
  const actividad = api.actividad_exclusiva;
  return {
    id: String(api.id_plan),
    nombre: api.nombre,
    descripcion: api.descripcion,
    tipo: api.tipo,
    clasesPorSemana: api.clases_por_semana,
    diasGracia: api.dias_gracia,
    actividad: actividad && { id: String(actividad.id_actividad), nombre: actividad.nombre, modalidad: actividad.modalidad },
    profesoraUnica: api.profesora_unica,
    precioVigente: api.precio_vigente?.precio ?? null,
    precioVigenteDesde: api.precio_vigente?.fecha_vigencia_desde ?? null,
    precioProgramado: api.precio_programado && {
      precio: api.precio_programado.precio,
      desde: api.precio_programado.fecha_vigencia_desde,
    },
    fechaBaja: api.fecha_baja,
  };
}

// Con incluirBajas también llegan los dados de baja: el filtro de estado se resuelve en pantalla.
export async function listarPlanes(): Promise<Plan[]> {
  const { data } = await apiClient.get("/planes", { params: { incluirBajas: "true" } });
  return z.array(planApiSchema).parse(data).map(aPlan);
}

export async function obtenerPlan(id: string): Promise<Plan> {
  const { data } = await apiClient.get(`/planes/${encodeURIComponent(id)}`);
  return aPlan(planApiSchema.parse(data));
}

// 409 si ya hay un plan vigente con ese nombre.
export async function crearPlan(cuerpo: CrearPlanBody): Promise<Plan> {
  const { data } = await apiClient.post("/planes", cuerpo);
  return aPlan(planApiSchema.parse(data));
}

// Solo un plan vigente se modifica; el tipo y el precio no viajan acá (ver plan.schemas.ts).
export async function actualizarPlan(id: string, cambios: ActualizarPlanBody): Promise<Plan> {
  const { data } = await apiClient.patch(`/planes/${encodeURIComponent(id)}`, cambios);
  return aPlan(planApiSchema.parse(data));
}

// Baja lógica: el plan deja de ofrecerse, pero las inscripciones que ya lo usan lo conservan.
export async function darDeBajaPlan(id: string): Promise<void> {
  await apiClient.delete(`/planes/${encodeURIComponent(id)}`);
}

export async function listarPreciosPlan(id: string): Promise<PrecioPlanHistorial[]> {
  const { data } = await apiClient.get(`/planes/${encodeURIComponent(id)}/precios`);
  return z.array(precioHistorialApiSchema).parse(data);
}

export async function registrarPrecioPlan(id: string, cuerpo: RegistrarPrecioBody): Promise<PrecioPlanHistorial> {
  const { data } = await apiClient.post(`/planes/${encodeURIComponent(id)}/precios`, cuerpo);
  return precioHistorialApiSchema.parse(data);
}
