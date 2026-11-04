import { useEffect, useRef, useState } from "react";
import { mensajeDeErrorApi } from "@/api/errores";
import { useCalcularLiquidaciones } from "@/features/honorarios/hooks/use-honorarios";
import { mesSigueAbierto } from "@/features/honorarios/utils/periodo";
import type { AdvertenciaHonorario, InformeHonorarios } from "@/types/honorarios";

interface EstadoActualizacion {
  /** Recalculando: el informe que se ve puede cambiar en un momento. */
  procesando: boolean;
  advertencias: AdvertenciaHonorario[];
  error: string | null;
  descartarAdvertencias: () => void;
}

/**
 * Mientras el mes sigue abierto (el actual, o el anterior hasta el día de cierre) se recalcula cada vez
 * que se entra, para ver los números al día sin tocar nada. Cerrar el mes lo hace el back solo
 * (CierreMensualHonorarios), así que un mes ya cerrado solo se muestra. Necesita HONORARIOS_LIQUIDAR:
 * sin ese permiso solo se muestra lo que haya.
 */
export function useActualizarMesAbierto(
  periodo: string,
  informe: InformeHonorarios | undefined,
  puedeLiquidar: boolean,
): EstadoActualizacion {
  const calcular = useCalcularLiquidaciones(periodo);
  const actualizados = useRef(new Set<string>());
  const [advertencias, setAdvertencias] = useState<AdvertenciaHonorario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: calcularMes } = calcular;

  useEffect(() => {
    if (!puedeLiquidar || !informe || informe.periodo !== periodo || actualizados.current.has(periodo)) return;
    if (!mesSigueAbierto(periodo)) return;

    actualizados.current.add(periodo);
    void (async () => {
      try {
        const resultado = await calcularMes();
        setAdvertencias(resultado.advertencias);
      } catch (causa) {
        setError(mensajeDeErrorApi(causa, "No se pudieron actualizar los honorarios."));
      }
    })();
  }, [periodo, informe, puedeLiquidar, calcularMes]);

  return {
    procesando: calcular.isPending,
    advertencias,
    error,
    descartarAdvertencias: () => setAdvertencias([]),
  };
}
