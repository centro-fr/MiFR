import { useParametros } from "@/features/notificaciones/hooks/use-notificaciones";
import { DIA_CIERRE_INICIAL } from "@/features/honorarios/utils/periodo";

const CLAVE = "DIA_CIERRE_HONORARIOS";

/**
 * El día del mes siguiente en que el back cierra solo cada mes (CierreMensualHonorarios). Se lee del
 * parámetro para que los textos no queden mal si la propietaria lo cambia. Si un back viejo todavía no
 * lo tiene, rige su valor inicial, que es el que usa el back.
 */
export function useDiaDeCierre() {
  const { data, isPending, isError, error, refetch, isFetching } = useParametros();
  const valor = data?.find(({ clave }) => clave === CLAVE)?.valor;
  return {
    diaDeCierre: typeof valor === "number" ? valor : DIA_CIERRE_INICIAL,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  };
}
