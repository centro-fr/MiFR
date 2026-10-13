import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cerrarAsistencia,
  listarClasesDeFecha,
  listarClasesDeHoy,
  marcarAsistencia,
  marcarTodosPresentes,
  obtenerAsistenciaDeClase,
} from "@/features/asistencia/api/asistencia-api";

export const ASISTENCIA_QUERY_KEY = ["asistencia-clase"] as const;
export const CLASES_ASISTENCIA_QUERY_KEY = ["clases-asistencia"] as const;

export function fechaActualArgentina(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parte = (tipo: "year" | "month" | "day") => partes.find((item) => item.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

export function useClasesAsistencia(fecha?: string, habilitada = true) {
  const fechaConsulta = fecha ?? fechaActualArgentina();
  const esHoy = fechaConsulta === fechaActualArgentina();
  return useQuery({
    queryKey: [...CLASES_ASISTENCIA_QUERY_KEY, fechaConsulta],
    queryFn: () => (esHoy ? listarClasesDeHoy() : listarClasesDeFecha(fechaConsulta)),
    enabled: habilitada,
    refetchInterval: 60_000,
  });
}

export function useAsistenciaDeClase(idClase: string | undefined) {
  return useQuery({
    queryKey: [...ASISTENCIA_QUERY_KEY, idClase],
    queryFn: () => {
      if (!idClase) throw new Error("Falta el identificador de la clase");
      return obtenerAsistenciaDeClase(idClase);
    },
    enabled: idClase !== undefined,
    refetchInterval: (consulta) => (consulta.state.data?.clase.estado === "PROGRAMADA" ? 30_000 : false),
  });
}

function useInvalidarAsistencia() {
  const queryClient = useQueryClient();
  return async (idClase: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...ASISTENCIA_QUERY_KEY, idClase] }),
      queryClient.invalidateQueries({ queryKey: CLASES_ASISTENCIA_QUERY_KEY }),
    ]);
  };
}

export function useMarcarAsistencia() {
  const invalidar = useInvalidarAsistencia();
  return useMutation({
    mutationFn: ({ idClase, idAlumno, asistio }: { idClase: string; idAlumno: number; asistio: boolean }) =>
      marcarAsistencia(idClase, idAlumno, asistio),
    onSuccess: (_resultado, { idClase }) => invalidar(idClase),
  });
}

export function useMarcarTodosPresentes() {
  const invalidar = useInvalidarAsistencia();
  return useMutation({
    mutationFn: marcarTodosPresentes,
    onSuccess: (_resultado, idClase) => invalidar(idClase),
  });
}

export function useCerrarAsistencia() {
  const invalidar = useInvalidarAsistencia();
  return useMutation({
    mutationFn: cerrarAsistencia,
    onSuccess: (_resultado, idClase) => invalidar(idClase),
  });
}
