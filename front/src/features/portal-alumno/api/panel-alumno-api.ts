import { apiClient } from "@/api/client";
import { panelAlumnoSchema, type PanelAlumno } from "../schemas/panel-alumno";

export async function obtenerPanelAlumno(): Promise<PanelAlumno> {
  const { data } = await apiClient.get("/alumnos/mi-panel");
  return panelAlumnoSchema.parse(data);
}
