import { useState } from "react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { useCalcularLiquidaciones } from "@/features/honorarios/hooks/use-honorarios";
import type { AdvertenciaHonorario } from "@/types/honorarios";

interface RecalculoDelMes {
  recalcular: () => Promise<void>;
  procesando: boolean;
  /** Lo que el cálculo no pudo liquidar (falta una tarifa): el back solo lo informa al calcular. */
  advertencias: AdvertenciaHonorario[];
  error: string | null;
  descartarAdvertencias: () => void;
}

/**
 * Recalcular es una escritura (POST /liquidaciones): se hace solo cuando la propietaria lo pide, nunca
 * por entrar a mirar. Lo que se abona no depende de esto: al cerrar el mes, el back lo calcula por última vez.
 */
export function useRecalcularMes(periodo: string): RecalculoDelMes {
  const calcular = useCalcularLiquidaciones(periodo);
  const [advertencias, setAdvertencias] = useState<AdvertenciaHonorario[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function recalcular() {
    setError(null);
    try {
      const resultado = await calcular.mutateAsync();
      setAdvertencias(resultado.advertencias);
      toast.success("Honorarios actualizados.");
    } catch (causa) {
      setError(mensajeDeErrorApi(causa, "No se pudieron actualizar los honorarios."));
    }
  }

  return {
    recalcular,
    procesando: calcular.isPending,
    advertencias,
    error,
    descartarAdvertencias: () => setAdvertencias([]),
  };
}
