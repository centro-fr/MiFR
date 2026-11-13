import { apiClient } from "@/api/client";
import {
  paginaAlumnosInactivosSchema,
  seguimientoInactividadSchema,
  type FiltrosAlumnosInactivos,
  type PaginaAlumnosInactivos,
  type SeguimientoInactividad,
} from "@/features/inactivos/schemas/inactivos";

export async function listarAlumnosInactivos(
  filtros: FiltrosAlumnosInactivos = {},
): Promise<PaginaAlumnosInactivos> {
  const params: Record<string, string | number> = {};
  if (filtros.id_profesora) params.id_profesora = filtros.id_profesora;
  if (filtros.id_plan) params.id_plan = filtros.id_plan;
  if (filtros.minimo_inasistencias) params.minimo_inasistencias = filtros.minimo_inasistencias;
  if (filtros.estado_gestion) params.estado_gestion = filtros.estado_gestion;
  if (filtros.incluir_ignorados) params.incluir_ignorados = "true";
  if (filtros.limit) params.limit = filtros.limit;
  if (filtros.offset !== undefined) params.offset = filtros.offset;

  const { data } = await apiClient.get("/informes/alumnos-inactivos", { params });
  return paginaAlumnosInactivosSchema.parse(data);
}

export async function registrarSeguimiento(
  idInscripcion: number,
  estado: "CONTACTADO" | "GESTIONADO" | "IGNORADO",
): Promise<SeguimientoInactividad> {
  const { data } = await apiClient.put(
    `/informes/alumnos-inactivos/${idInscripcion}/seguimiento`,
    { estado },
  );
  return seguimientoInactividadSchema.parse(data);
}

export async function quitarSeguimiento(idInscripcion: number): Promise<void> {
  await apiClient.delete(`/informes/alumnos-inactivos/${idInscripcion}/seguimiento`);
}
