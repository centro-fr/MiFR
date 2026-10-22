import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarPromocion,
  crearPromocion,
  desactivarPromocion,
  listarPromociones,
} from "@/features/promociones/api/promociones-api";
import type { PromocionBody } from "@/features/promociones/schemas/promocion";

export const PROMOCIONES_QUERY_KEY = ["promociones"] as const;

export function usePromociones() {
  return useQuery({ queryKey: PROMOCIONES_QUERY_KEY, queryFn: listarPromociones, staleTime: 60_000 });
}

function useInvalidarPromociones() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PROMOCIONES_QUERY_KEY });
}

export function useCrearPromocion() {
  const invalidar = useInvalidarPromociones();
  return useMutation({ mutationFn: crearPromocion, onSuccess: invalidar });
}

export function useActualizarPromocion() {
  const invalidar = useInvalidarPromociones();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: Partial<PromocionBody> }) => actualizarPromocion(id, cambios),
    onSuccess: invalidar,
  });
}

export function useDesactivarPromocion() {
  const invalidar = useInvalidarPromociones();
  return useMutation({ mutationFn: desactivarPromocion, onSuccess: invalidar });
}
