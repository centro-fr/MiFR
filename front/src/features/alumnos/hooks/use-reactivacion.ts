import { useMutation, useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  actualizarHorarios,
  cambiarPlan,
  cancelarCambioPlan,
  type ResultadoCambioPlan,
} from "@/features/alumnos/api/inscripciones-api";
import {
  listarHorariosElegibles,
  listarPlanes,
  obtenerInscripcionAnterior,
  reactivarAlumno,
} from "@/features/alumnos/api/reactivacion-api";
import { ALUMNOS_QUERY_KEY } from "@/features/alumnos/hooks/use-alumnos";
import type { ReactivarAlumnoBody } from "@/features/alumnos/schemas/reactivacion";
import { listarProfesoras, type ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import { HORARIOS_QUERY_KEY, PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
// Cuelga de la clave de US-11: al cambiar un plan, esta lista también se refresca. No puede ser
// ["planes"] a secas: esa la usa la pre-inscripción (US-05) con la respuesta cruda del back.
import { PLANES_QUERY_KEY } from "@/features/planes/hooks/use-planes";
import type { HorarioElegible, InscripcionAnterior, PlanReactivacion } from "@/types/alumno";

// Planes y profesoras cambian poco; los horarios y la inscripción anterior se piden frescos
// cada vez que se abre el formulario.
const CINCO_MINUTOS = 5 * 60_000;

/** Lo que se puede elegir al volver a inscribir o al cambiar de plan u horarios. */
export interface OpcionesDeInscripcion {
  planes: PlanReactivacion[];
  profesoras: ProfesoraDatos[];
  horarios: HorarioElegible[];
}

export interface DatosReactivacion extends OpcionesDeInscripcion {
  anterior: InscripcionAnterior | null;
}

const consultasDeOpciones = [
  { queryKey: [...PLANES_QUERY_KEY, "reactivacion"], queryFn: listarPlanes, staleTime: CINCO_MINUTOS },
  { queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: CINCO_MINUTOS },
  { queryKey: [...HORARIOS_QUERY_KEY, "elegibles"], queryFn: listarHorariosElegibles },
] as const;

/** Junta varias consultas: los datos cuando están todas, el primer error y cómo reintentar las que fallaron. */
function combinar<T>(consultas: UseQueryResult[], armar: () => T) {
  const conError = consultas.find((consulta) => consulta.isError);
  return {
    datos: consultas.every((consulta) => consulta.isSuccess) ? armar() : undefined,
    error: conError?.error ?? null,
    reintentar: () => consultas.filter((consulta) => consulta.isError).forEach((consulta) => void consulta.refetch()),
  };
}

export function useOpcionesDeInscripcion() {
  return useQueries({
    queries: consultasDeOpciones,
    combine: ([planes, profesoras, horarios]) =>
      combinar([planes, profesoras, horarios], () => ({
        planes: planes.data,
        profesoras: profesoras.data,
        horarios: horarios.data,
      }) as OpcionesDeInscripcion),
  });
}

export function useDatosReactivacion(idAlumno: number) {
  return useQueries({
    queries: [
      ...consultasDeOpciones,
      {
        queryKey: [...ALUMNOS_QUERY_KEY, idAlumno, "inscripcion-anterior"],
        queryFn: () => obtenerInscripcionAnterior(idAlumno),
      },
    ],
    combine: ([planes, profesoras, horarios, anterior]) =>
      combinar([planes, profesoras, horarios, anterior], () => ({
        planes: planes.data,
        profesoras: profesoras.data,
        horarios: horarios.data,
        anterior: anterior.data,
      }) as DatosReactivacion),
  });
}

// Reactivar o cambiar de plan cambia el estado y la inscripción del alumno, y el cupo de los
// horarios: se invalidan los alumnos y los horarios.
function useInvalidarInscripcion() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: HORARIOS_QUERY_KEY }),
    ]);
}

export function useReactivarAlumno() {
  const invalidar = useInvalidarInscripcion();
  return useMutation({
    mutationFn: ({ id, cuerpo }: { id: number; cuerpo: ReactivarAlumnoBody }) => reactivarAlumno(id, cuerpo),
    onSuccess: invalidar,
  });
}

/**
 * Con el mismo plan solo cambian los horarios (la profesora a cargo queda igual); con otro plan,
 * el back lo aplica en el momento o, con el plan vigente, lo programa para cuando termina la gracia (US-14).
 */
export function useCambiarPlanYHorarios(actual: { idInscripcion: number; idPlan: number }) {
  const invalidar = useInvalidarInscripcion();
  return useMutation({
    mutationFn: async (cuerpo: ReactivarAlumnoBody): Promise<ResultadoCambioPlan> => {
      if (cuerpo.id_plan !== actual.idPlan) return cambiarPlan(actual.idInscripcion, cuerpo);
      await actualizarHorarios(actual.idInscripcion, cuerpo.ids_horarios);
      return { programadoPara: null };
    },
    onSuccess: invalidar,
  });
}

export function useCancelarCambioPlan() {
  const invalidar = useInvalidarInscripcion();
  return useMutation({
    mutationFn: (idInscripcion: number) => cancelarCambioPlan(idInscripcion),
    onSuccess: invalidar,
  });
}
