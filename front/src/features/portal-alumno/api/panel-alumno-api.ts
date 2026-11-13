import { apiClient } from "@/api/client";
import { panelAlumnoSchema, type PanelAlumno } from "../schemas/panel-alumno";

/** Sin `idAlumno`, el del alumno de la sesión; el tutor lo pide para el menor que eligió. */
export async function obtenerPanelAlumno(idAlumno?: number): Promise<PanelAlumno> {
  const { data } = await apiClient.get("/alumnos/mi-panel", { params: idAlumno ? { id_alumno: idAlumno } : undefined });
  return panelAlumnoSchema.parse(data);
}
