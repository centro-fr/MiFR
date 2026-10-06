import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatriz, mapMatrizError, putMatriz } from "@/features/seguridad/api/seguridad-api";
import type { CambioPermiso, MatrizErrorCode, MatrizPermisos } from "@/types/permissions";
import type { RoleCode } from "@/types/auth";

export const MATRIZ_QUERY_KEY = ["seguridad", "matriz"] as const;

export function useMatriz() {
  return useQuery<MatrizPermisos, MatrizErrorCode>({
    queryKey: MATRIZ_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getMatriz();
      } catch (error) {
        throw mapMatrizError(error);
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function aplicarCambiosLocal(matriz: Record<RoleCode, string[]>, cambios: CambioPermiso[]) {
  const copia: Record<RoleCode, string[]> = {
    PROPIETARIA: [...matriz.PROPIETARIA],
    PROFESORA: [...matriz.PROFESORA],
    ALUMNO: [...matriz.ALUMNO],
    TUTOR: [...matriz.TUTOR],
  };
  for (const { rol, permiso, otorgado } of cambios) {
    const lista = new Set(copia[rol]);
    if (otorgado) lista.add(permiso);
    else lista.delete(permiso);
    copia[rol] = [...lista];
  }
  return copia;
}

export function useActualizarMatriz() {
  const queryClient = useQueryClient();
  return useMutation<void, MatrizErrorCode, CambioPermiso[], { anterior: MatrizPermisos | undefined }>({
    mutationFn: (cambios) => putMatriz(cambios),
    onMutate: async (cambios) => {
      await queryClient.cancelQueries({ queryKey: MATRIZ_QUERY_KEY });
      const anterior = queryClient.getQueryData<MatrizPermisos>(MATRIZ_QUERY_KEY);
      if (anterior) {
        queryClient.setQueryData<MatrizPermisos>(MATRIZ_QUERY_KEY, {
          ...anterior,
          matriz: aplicarCambiosLocal(anterior.matriz, cambios),
        });
      }
      return { anterior };
    },
    onError: (_error, _cambios, context) => {
      // La spec exige conservar los valores ante error de red: rollback.
      if (context?.anterior) {
        queryClient.setQueryData(MATRIZ_QUERY_KEY, context.anterior);
      }
    },
    onSuccess: () => {
      // Los permisos efectivos pueden haber cambiado (incluso los propios).
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: MATRIZ_QUERY_KEY });
    },
    retry: false,
  });
}
