import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";

/**
 * El id_profesora de quien tiene la sesión, buscado por su usuario (no por el nombre, que puede
 * repetirse). null si no tiene un perfil de profesora activo: GET /profesoras trae solo las activas.
 */
export function useMiIdDeProfesora() {
  const { user } = useAuth();
  const consulta = useQuery({ queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: 5 * 60_000 });
  const idProfesora = consulta.data?.find((profesora) => profesora.idUsuario === user?.id_usuario)?.id ?? null;
  return {
    idProfesora,
    isPending: consulta.isPending,
    isError: consulta.isError,
    error: consulta.error,
    refetch: consulta.refetch,
  };
}
