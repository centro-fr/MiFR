import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  actualizarAlumno,
  darDeBajaAlumno,
  listarAlumnosRecientesPrimero,
  obtenerAlumno,
  type FiltrosAlumnos,
} from "@/features/alumnos/api/alumnos-api";
import type { ActualizarAlumnoBody, RespuestaAlumnos } from "@/features/alumnos/schemas/alumno";
import { unaFilaPorPlan } from "@/features/alumnos/utils/filas-por-plan";
import type { MotivoBaja } from "@/types/alumno";

// Todo lo de alumnos cuelga de esta clave: una baja, un alta o una edición refrescan el listado,
// la ficha y las pre-inscripciones pendientes.
export const ALUMNOS_QUERY_KEY = ["alumnos"] as const;

export function fichaAlumnoQueryKey(id: number) {
  return [...ALUMNOS_QUERY_KEY, id, "ficha"] as const;
}

/**
 * Listado del más reciente al más antiguo. Se pide completo una vez por combinación de filtros y la
 * página se recorta acá: cambiar de página no vuelve a consultar al back. Con `unaFilaPorPlan`, quien
 * tiene varios planes vigentes ocupa una fila por plan, y el total cuenta filas.
 */
export function useAlumnos({ limit, offset, ...filtros }: FiltrosAlumnos, opciones: { unaFilaPorPlan?: boolean } = {}) {
  return useQuery({
    queryKey: [...ALUMNOS_QUERY_KEY, "listado", filtros],
    queryFn: () => listarAlumnosRecientesPrimero(filtros),
    select: (alumnos): RespuestaAlumnos => {
      const todos = opciones.unaFilaPorPlan ? unaFilaPorPlan(alumnos, filtros) : alumnos;
      return { items: todos.slice(offset, offset + limit), total: todos.length, limit, offset };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Consulta la lista completa sin recortar paginación para resolver datos de contacto, DNI y cuotas
 * de alumnos que provienen de otros módulos (ej. alumnos inactivos / contactar).
 */
export function useListaCompletaAlumnos() {
  return useQuery({
    queryKey: [...ALUMNOS_QUERY_KEY, "lista-completa"],
    queryFn: () =>
      listarAlumnosRecientesPrimero({
        busqueda: "",
        estado: "TODOS",
        id_plan: "",
        id_profesora: "",
        id_actividad: "",
        incluir_bajas: true,
      }),
    staleTime: 60_000,
  });
}

// Un 404 no se arregla reintentando: se corta enseguida y la página muestra "no encontrado".
function reintentarSalvo404(intentos: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response?.status === 404) return false;
  return intentos < 2;
}

export function esAlumnoNoEncontrado(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

export function useAlumno(id: number) {
  return useQuery({
    queryKey: fichaAlumnoQueryKey(id),
    queryFn: () => obtenerAlumno(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 30_000,
    retry: reintentarSalvo404,
  });
}

function useInvalidarTodoAlumnos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY });
}

export function useActualizarAlumno(id: number) {
  const invalidar = useInvalidarTodoAlumnos();
  return useMutation({
    mutationFn: (cambios: ActualizarAlumnoBody) => actualizarAlumno(id, cambios),
    onSuccess: invalidar,
  });
}

export function useDarDeBajaAlumno(id: number) {
  const invalidar = useInvalidarTodoAlumnos();
  return useMutation({
    mutationFn: ({ motivo, detalle, idInscripcion }: { motivo: MotivoBaja; detalle?: string; idInscripcion?: number }) =>
      darDeBajaAlumno(id, motivo, detalle, idInscripcion),
    onSuccess: invalidar,
  });
}

// Después de una pre-inscripción cambian los alumnos, sus inscripciones y el cupo de los horarios.
export function useInvalidarAlumnos() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ["inscripciones"] }),
      queryClient.invalidateQueries({ queryKey: ["horarios"] }),
    ]);
}
