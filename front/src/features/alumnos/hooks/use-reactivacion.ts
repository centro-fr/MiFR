import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  listarHorariosElegibles,
  listarPlanes,
  obtenerInscripcionAnterior,
  reactivarAlumno,
} from "@/features/alumnos/api/reactivacion-api";
import { ALUMNOS_QUERY_KEY } from "@/features/alumnos/hooks/use-ficha-alumno";
import type { ReactivarAlumnoBody } from "@/features/alumnos/schemas/reactivacion";
import { listarProfesoras, type ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import { HORARIOS_QUERY_KEY, PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import type { HorarioElegible, InscripcionAnterior, PlanReactivacion } from "@/types/alumno";

// Planes y profesoras cambian poco; los horarios y la inscripción anterior se piden frescos
// cada vez que se abre el formulario.
const CINCO_MINUTOS = 5 * 60_000;

export interface DatosReactivacion {
  planes: PlanReactivacion[];
  profesoras: ProfesoraDatos[];
  horarios: HorarioElegible[];
  anterior: InscripcionAnterior | null;
}

export function useDatosReactivacion(idAlumno: string) {
  return useQueries({
    queries: [
      { queryKey: ["planes"], queryFn: listarPlanes, staleTime: CINCO_MINUTOS },
      { queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: CINCO_MINUTOS },
      { queryKey: [...HORARIOS_QUERY_KEY, "elegibles"], queryFn: listarHorariosElegibles },
      {
        queryKey: [...ALUMNOS_QUERY_KEY, idAlumno, "inscripcion-anterior"],
        queryFn: () => obtenerInscripcionAnterior(idAlumno),
      },
    ],
    combine: ([planes, profesoras, horarios, anterior]) => {
      const consultas = [planes, profesoras, horarios, anterior];
      const conError = consultas.find((consulta) => consulta.isError);
      const listos = consultas.every((consulta) => consulta.isSuccess);
      return {
        datos: listos
          ? ({ planes: planes.data, profesoras: profesoras.data, horarios: horarios.data, anterior: anterior.data } as DatosReactivacion)
          : undefined,
        error: conError?.error ?? null,
        reintentar: () => consultas.filter((consulta) => consulta.isError).forEach((consulta) => void consulta.refetch()),
      };
    },
  });
}

// La reactivación cambia el estado en la ficha y en los listados: se invalida todo "alumnos".
export function useReactivarAlumno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cuerpo }: { id: string; cuerpo: ReactivarAlumnoBody }) => reactivarAlumno(id, cuerpo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
  });
}
