import { useEffect, useRef, useState } from "react";
import { mensajeDeErrorApi } from "@/api/errores";
import { useCalcularLiquidaciones, useCerrarMes } from "@/features/honorarios/hooks/use-honorarios";
import { mesSigueAbierto, mesSiguiente, periodoActual } from "@/features/honorarios/utils/periodo";
import type { AdvertenciaHonorario, InformeHonorarios } from "@/types/honorarios";

interface EstadoAsegurar {
  /** Recalculando o cerrando: el informe que se ve puede cambiar en un momento. */
  procesando: boolean;
  advertencias: AdvertenciaHonorario[];
  error: string | null;
  descartarAdvertencias: () => void;
}

/**
 * Para que la propietaria no tenga que calcular ni cerrar nada a mano:
 * - Mes abierto (el actual, o el anterior hasta el día de cierre): se recalcula cada vez que se entra.
 * - Pasado el día de cierre, si quedó algo en borrador: se recalcula por última vez y se cierra todo.
 *   El mes anterior se cierra aunque nadie lo haya calculado; los más viejos sin calcular se dejan
 *   como están (pueden ser de antes de empezar a usar el sistema).
 *
 * Mientras el back no lo haga solo, lo hace esta pantalla. Necesita HONORARIOS_LIQUIDAR: sin ese
 * permiso solo se muestra lo que haya.
 */
export function useAsegurarMes(periodo: string, informe: InformeHonorarios | undefined, puedeLiquidar: boolean): EstadoAsegurar {
  const calcular = useCalcularLiquidaciones(periodo);
  const cerrarMes = useCerrarMes(periodo);
  const procesados = useRef(new Set<string>());
  const [advertencias, setAdvertencias] = useState<AdvertenciaHonorario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: calcularMes } = calcular;
  const { mutateAsync: cerrarTodas } = cerrarMes;

  useEffect(() => {
    if (!puedeLiquidar || !informe || informe.periodo !== periodo || procesados.current.has(periodo)) return;
    const abierto = mesSigueAbierto(periodo);
    const hayBorradores = informe.liquidaciones.some(({ estado }) => estado === "BORRADOR");
    const sinCalcular = informe.liquidaciones.length === 0;
    const esElAnterior = mesSiguiente(periodo) === periodoActual();
    if (!abierto && !hayBorradores && !(sinCalcular && esElAnterior)) return;

    procesados.current.add(periodo);
    void (async () => {
      try {
        const resultado = await calcularMes();
        setAdvertencias(resultado.advertencias);
        if (!abierto) {
          const borradores = resultado.informe.liquidaciones.filter(({ estado }) => estado === "BORRADOR").map(({ id }) => id);
          if (borradores.length > 0) await cerrarTodas(borradores);
        }
      } catch (causa) {
        setError(mensajeDeErrorApi(causa, "No se pudieron actualizar los honorarios."));
      }
    })();
  }, [periodo, informe, puedeLiquidar, calcularMes, cerrarTodas]);

  return {
    procesando: calcular.isPending || cerrarMes.isPending,
    advertencias,
    error,
    descartarAdvertencias: () => setAdvertencias([]),
  };
}
