import { useQuery } from "@tanstack/react-query";
import { obtenerPanelAlumno } from "../api/panel-alumno-api";

export const PANEL_ALUMNO_QUERY_KEY = ["panel-alumno"] as const;

export function usePanelAlumno() {
  return useQuery({
    queryKey: PANEL_ALUMNO_QUERY_KEY,
    queryFn: obtenerPanelAlumno,
    staleTime: 30_000,
  });
}
