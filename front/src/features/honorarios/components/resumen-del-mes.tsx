import { Loader2, RefreshCw } from "lucide-react";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BadgeEstadoLiquidacion } from "@/features/honorarios/components/badge-estado-liquidacion";
import { alumnosDelMes, estadoDelMes, fechaHora, leyendaDelTotal, ultimoCalculo } from "@/features/honorarios/utils/formato-honorarios";
import { esPeriodoEnCurso } from "@/features/honorarios/utils/periodo";
import type { InformeHonorarios } from "@/types/honorarios";
import { formatearPrecio } from "@/utils/moneda";

const TARJETA = "rounded-2xl border-border bg-white p-5 shadow-sm dark:bg-surface-low";

function TotalDelMes({ informe }: { informe: InformeHonorarios }) {
  return (
    <Card className={TARJETA}>
      <h2 className="text-sm font-semibold text-muted-foreground">Total del mes</h2>
      <p className="mt-1 text-3xl font-black tracking-tight text-dark tabular-nums dark:text-white">
        {formatearPrecio(informe.totalGeneral)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{leyendaDelTotal(alumnosDelMes(informe.liquidaciones))}</p>
    </Card>
  );
}

interface PropsEstado {
  informe: InformeHonorarios;
  calculando: boolean;
  onRecalcular: () => void;
}

function mensajeDeEstado(enRevision: number, total: number): string {
  if (enRevision === 0) return "Los honorarios de todos los profesores están cerrados: ya no cambian.";
  if (enRevision < total) return `${enRevision} de ${total} profesores siguen en revisión.`;
  return "Se puede recalcular hasta cerrar los honorarios de cada profesor/a.";
}

function EstadoDeLaLiquidacion({ informe, calculando, onRecalcular }: PropsEstado) {
  const { liquidaciones } = informe;
  const estado = estadoDelMes(liquidaciones);
  const calculadoEl = ultimoCalculo(liquidaciones);
  const enRevision = liquidaciones.filter((fila) => fila.estado === "BORRADOR").length;
  return (
    <Card className={`${TARJETA} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Estado de los honorarios</h2>
          <BadgeEstadoLiquidacion estado={estado} />
        </div>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{mensajeDeEstado(enRevision, liquidaciones.length)}</p>
        {calculadoEl && <p className="mt-1 text-sm text-muted-foreground">Calculado el {fechaHora(calculadoEl)}</p>}
        {enRevision > 0 && esPeriodoEnCurso(informe.periodo) && (
          <p className="mt-1 text-sm text-muted-foreground">El mes está en curso: lo que se cobre se suma al recalcular.</p>
        )}
      </div>
      {enRevision > 0 && (
        <Can permission="HONORARIOS_LIQUIDAR">
          <Button
            type="button"
            variant="outline"
            onClick={onRecalcular}
            disabled={calculando}
            className="min-h-11 shrink-0 rounded-xl font-bold"
          >
            {calculando ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
            {calculando ? "Recalculando…" : "Recalcular"}
          </Button>
        </Can>
      )}
    </Card>
  );
}

export function ResumenDelMes(props: PropsEstado) {
  return (
    <section aria-label="Resumen del mes" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TotalDelMes informe={props.informe} />
      <EstadoDeLaLiquidacion {...props} />
    </section>
  );
}
