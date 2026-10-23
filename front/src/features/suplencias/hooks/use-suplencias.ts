import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarSuplencia,
  eliminarSuplencia,
  listarSuplencias,
  registrarSuplencia,
} from "@/features/suplencias/api/suplencias-api";
import type { RegistrarSuplenciaBody } from "@/features/suplencias/schemas/suplencia";

export const SUPLENCIAS_QUERY_KEY = ["suplencias"] as const;

export function useSuplencias() {
  return useQuery({ queryKey: SUPLENCIAS_QUERY_KEY, queryFn: listarSuplencias, staleTime: 30_000 });
}

function useInvalidarSuplencias() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SUPLENCIAS_QUERY_KEY });
}

export function useRegistrarSuplencia() {
  const invalidar = useInvalidarSuplencias();
  return useMutation({ mutationFn: (cuerpo: RegistrarSuplenciaBody) => registrarSuplencia(cuerpo), onSuccess: invalidar });
}

export function useActualizarSuplencia() {
  const invalidar = useInvalidarSuplencias();
  return useMutation({
    mutationFn: ({ idClase, cambios }: { idClase: string; cambios: { id_profesora_suplente?: number; motivo?: string } }) =>
      actualizarSuplencia(idClase, cambios),
    onSuccess: invalidar,
  });
}

export function useEliminarSuplencia() {
  const invalidar = useInvalidarSuplencias();
  return useMutation({ mutationFn: eliminarSuplencia, onSuccess: invalidar });
}
