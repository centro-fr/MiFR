import { useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DialogoTarifa } from "@/features/honorarios/components/dialogo-tarifa";
import { useTarifas } from "@/features/honorarios/hooks/use-honorarios";
import { ETIQUETA_CONCEPTO, describirTarifa, tarifaVigente } from "@/features/honorarios/utils/formato-honorarios";
import { ultimoDiaDe } from "@/features/honorarios/utils/periodo";
import type { ConceptoTarifa, TarifaHonorario } from "@/types/honorarios";

const CONCEPTOS: ConceptoTarifa[] = ["ALUMNO_A_CARGO", "HORA_SUPLENCIA"];

function ValoresDeLaTarifa({ tarifas, dia }: { tarifas: TarifaHonorario[]; dia: string }) {
  const vigentes = CONCEPTOS.map((concepto) => ({ concepto, tarifa: tarifaVigente(tarifas, concepto, dia) }));
  if (vigentes.every(({ tarifa }) => !tarifa)) {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
        <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
        Sin tarifa: los honorarios del mes no suman nada.
      </p>
    );
  }
  return (
    <dl className="mt-1 flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
      {vigentes.map(({ concepto, tarifa }) => (
        <div key={concepto} className="flex flex-wrap gap-x-1.5">
          <dt className="text-muted-foreground">{ETIQUETA_CONCEPTO[concepto]}:</dt>
          {tarifa ? (
            <dd className="font-bold text-slate-900 dark:text-white">{describirTarifa(tarifa, concepto)}</dd>
          ) : (
            <dd className="font-bold text-amber-800 dark:text-amber-200">sin cargar</dd>
          )}
        </div>
      ))}
    </dl>
  );
}

function ContenidoDeLaTarifa({ dia }: { dia: string }) {
  const { data: tarifas, isPending, isError, error, refetch, isFetching } = useTarifas();
  if (isPending) return <Skeleton aria-label="Cargando la tarifa" className="mt-1 h-5 w-72 max-w-full rounded-md" />;
  if (isError) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {mensajeDeErrorApi(error, "No se pudo cargar la tarifa.")}
        </p>
        <Button type="button" variant="link" disabled={isFetching} onClick={() => void refetch()} className="h-auto min-h-11 p-0 font-bold">
          Reintentar
        </Button>
      </div>
    );
  }
  return <ValoresDeLaTarifa tarifas={tarifas} dia={dia} />;
}

/**
 * La tarifa es una sola para todo el estudio: se muestra y se cambia acá, aunque el mes todavía no se
 * haya calculado. Se ve la que rige el último día del mes, que es la que usa el cálculo.
 */
export function TarifaDelMes({ periodo }: { periodo: string }) {
  const [cambiando, setCambiando] = useState(false);
  const idTitulo = useId();
  return (
    <section
      aria-labelledby={idTitulo}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-surface-low"
    >
      <div className="min-w-0">
        <h2 id={idTitulo} className="text-sm font-semibold text-muted-foreground">
          Tarifa del mes · igual para todos los profesores
        </h2>
        <ContenidoDeLaTarifa dia={ultimoDiaDe(periodo)} />
      </div>
      <Can permission="HONORARIOS_LIQUIDAR">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCambiando(true)}
          className="min-h-11 shrink-0 rounded-xl font-bold pointer-fine:min-h-10"
        >
          Cambiar tarifa
        </Button>
        <DialogoTarifa abierto={cambiando} periodo={periodo} onClose={() => setCambiando(false)} />
      </Can>
    </section>
  );
}
