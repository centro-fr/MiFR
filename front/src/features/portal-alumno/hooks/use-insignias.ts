import { useQuery } from "@tanstack/react-query";
import { obtenerFichaInsignias } from "../api/insignias-api";

export function useInsignias(idAlumno: number | undefined) {
  return useQuery({
    queryKey: ["insignias", idAlumno],
    queryFn: () => obtenerFichaInsignias(idAlumno as number),
    enabled: idAlumno !== undefined,
    staleTime: 60_000,
  });
}
