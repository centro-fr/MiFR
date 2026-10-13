import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarPagos,
  obtenerComprobante,
  registrarCobroEfectivo,
} from "@/features/cobros/api/cobros-api";
import type { RegistrarCobroEfectivoBody } from "@/features/cobros/schemas/cobro-efectivo.schema";

export const CLAVES_PAGOS = {
  todos: ["pagos"] as const,
  porAlumno: (idAlumno: number) => ["pagos", "alumno", idAlumno] as const,
  porInscripcion: (idInscripcion: number) => ["pagos", "inscripcion", idInscripcion] as const,
  comprobante: (idPago: number) => ["pagos", "comprobante", idPago] as const,
};

/** Hook para registrar un cobro en efectivo y refrescar el estado de cuotas y alumnos. */
export function useRegistrarCobroEfectivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cuerpo: RegistrarCobroEfectivoBody) => registrarCobroEfectivo(cuerpo),
    onSuccess: (_, variables) => {
      // Invalida listados de alumnos y detalle para actualizar estado_cuota inmediatamente (US-15)
      queryClient.invalidateQueries({ queryKey: ["alumnos"] });
      queryClient.invalidateQueries({ queryKey: CLAVES_PAGOS.todos });
      if (variables.id_inscripcion) {
        queryClient.invalidateQueries({
          queryKey: CLAVES_PAGOS.porInscripcion(variables.id_inscripcion),
        });
      }
    },
  });
}

/** Hook para obtener el comprobante digital de un pago confirmado. */
export function useComprobante(idPago: number | null, habilitado = true) {
  return useQuery({
    queryKey: idPago ? CLAVES_PAGOS.comprobante(idPago) : ["pagos", "comprobante", "vacio"],
    queryFn: () => {
      if (!idPago) throw new Error("ID de pago no especificado");
      return obtenerComprobante(idPago);
    },
    enabled: Boolean(idPago) && habilitado,
    staleTime: 1000 * 60 * 10, // Los comprobantes son inmutables
  });
}

/** Hook para consultar el historial de pagos de un alumno o inscripción. */
export function useHistorialPagos({
  idAlumno,
  idInscripcion,
  habilitado = true,
}: {
  idAlumno?: number;
  idInscripcion?: number;
  habilitado?: boolean;
} = {}) {
  return useQuery({
    queryKey: idAlumno
      ? CLAVES_PAGOS.porAlumno(idAlumno)
      : idInscripcion
        ? CLAVES_PAGOS.porInscripcion(idInscripcion)
        : CLAVES_PAGOS.todos,
    queryFn: () => listarPagos({ id_alumno: idAlumno, id_inscripcion: idInscripcion }),
    enabled: habilitado,
  });
}
