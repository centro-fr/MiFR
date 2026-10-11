import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  actualizarPlan,
  crearPlan,
  darDeBajaPlan,
  listarPlanes,
  obtenerPlan,
} from "@/features/planes/api/planes-api";
import type { ActualizarPlanBody, CrearPlanBody } from "@/features/planes/schemas/plan";

// La misma clave que usa la reactivación de alumnos (US-08) para ofrecer planes: al cambiar un
// plan, ese listado también se refresca.
export const PLANES_QUERY_KEY = ["planes"] as const;

// El catálogo cambia poco: se reutiliza unos minutos entre pantallas.
const CINCO_MINUTOS = 5 * 60_000;

export function usePlanes() {
  return useQuery({ queryKey: [...PLANES_QUERY_KEY, "con-bajas"], queryFn: listarPlanes, staleTime: CINCO_MINUTOS });
}

// Un 404 no se arregla reintentando: la página muestra "no encontrado" enseguida.
function reintentarSalvo404(intentos: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response?.status === 404) return false;
  return intentos < 2;
}

export function usePlan(id: string) {
  return useQuery({ queryKey: [...PLANES_QUERY_KEY, id], queryFn: () => obtenerPlan(id), retry: reintentarSalvo404 });
}

export function esPlanNoEncontrado(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

function useInvalidarPlanes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PLANES_QUERY_KEY });
}

export function useCrearPlan() {
  const invalidar = useInvalidarPlanes();
  return useMutation({ mutationFn: (cuerpo: CrearPlanBody) => crearPlan(cuerpo), onSuccess: invalidar });
}

export function useActualizarPlan() {
  const invalidar = useInvalidarPlanes();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: ActualizarPlanBody }) => actualizarPlan(id, cambios),
    onSuccess: invalidar,
  });
}

export function useDarDeBajaPlan() {
  const invalidar = useInvalidarPlanes();
  return useMutation({ mutationFn: (id: string) => darDeBajaPlan(id), onSuccess: invalidar });
}
