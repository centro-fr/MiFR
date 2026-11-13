import { useQuery } from "@tanstack/react-query";
import { obtenerPanelAlumno } from "../api/panel-alumno-api";
import { useAlumnoElegido } from "./use-alumno-elegido";

export const PANEL_ALUMNO_QUERY_KEY = ["panel-alumno"] as const;

/** El panel del alumno de la sesión o del menor que eligió el tutor. */
export function usePanelAlumno() {
  const { consulta, elegido } = useAlumnoElegido();
  const idAlumno = elegido?.id;
  return useQuery({
    queryKey: [...PANEL_ALUMNO_QUERY_KEY, idAlumno ?? "propio"],
    queryFn: () => obtenerPanelAlumno(idAlumno),
    // Se espera a saber a quién mirar; si eso falla, se pide el propio.
    enabled: !consulta.isPending,
    staleTime: 30_000,
  });
}
