import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle, CircleCheck, RefreshCw, Settings2 } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BloqueCuotasVencidas, BloqueEfectivo, BloqueTransferencias } from "@/features/notificaciones/components/bloques-resumen";
import { useResumenDiario } from "@/features/notificaciones/hooks/use-notificaciones";
import type { BloqueDelResumen, ResumenDiario } from "@/features/notificaciones/schemas/resumen-diario";
import { cn } from "@/utils/cn";

const FORMATO_DIA = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const NOMBRE_BLOQUE: Record<BloqueDelResumen, string> = {
  transferencias: "las transferencias",
  efectivo: "el efectivo",
  cuotas_vencidas: "las cuotas vencidas",
};

/** "2026-10-20T00:00:00.000Z" → "Martes, 20 de octubre". */
function diaDelResumen(fecha: string): string {
  const texto = FORMATO_DIA.format(new Date(fecha));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el resumen del día" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((indice) => (
        <Skeleton key={indice} className="h-48 rounded-2xl" />
      ))}
    </div>
  );
}

function TodoAlDia() {
  return (
    <Card className="flex items-center gap-4 rounded-2xl border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
        <CircleCheck className="size-6" />
      </span>
      <div>
        <h3 className="text-base font-extrabold text-emerald-900 dark:text-emerald-100">Todo al día</h3>
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          No hay transferencias pendientes de verificación, efectivo pendiente de rendición ni cuotas vencidas.
        </p>
      </div>
    </Card>
  );
}

function AvisoParcial({ bloques }: { bloques: BloqueDelResumen[] }) {
  const lista = bloques.map((bloque) => NOMBRE_BLOQUE[bloque]).join(", ");
  return (
    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      Resumen parcial: no se pudo armar el bloque de {lista}. Lo demás está actualizado.
    </p>
  );
}

function Bloques({ resumen }: { resumen: ResumenDiario }) {
  if (resumen.sin_novedades) return <TodoAlDia />;
  return (
    <>
      {resumen.bloques_con_error.length > 0 && <AvisoParcial bloques={resumen.bloques_con_error} />}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BloqueTransferencias datos={resumen.transferencias} />
        <BloqueEfectivo datos={resumen.efectivo} />
        <BloqueCuotasVencidas datos={resumen.cuotas_vencidas} />
      </div>
    </>
  );
}

// US-26: la misma información que la notificación diaria, a la vista apenas entra la propietaria.
export function ResumenDelDia() {
  const { data: resumen, isPending, isError, error, refetch, isFetching } = useResumenDiario();
  return (
    <section aria-labelledby="resumen-del-dia-titulo" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="resumen-del-dia-titulo" className="text-lg font-extrabold text-slate-900 dark:text-white">
            Resumen del día
          </h2>
          {resumen && <p className="text-sm text-muted-foreground">{diaDelResumen(resumen.fecha)} · lo que tenés pendiente</p>}
        </div>
        <div className="flex shrink-0 items-center">
          <Can permission="PARAMETROS_EDITAR">
            <Button asChild variant="ghost" size="icon" className="size-11 rounded-lg text-slate-500 dark:text-slate-300">
              <Link to="/app/notificaciones/configuracion" aria-label="Configurar los avisos" title="Configurar los avisos">
                <Settings2 aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </Can>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Actualizar el resumen del día"
            className="size-11 rounded-lg text-slate-500 dark:text-slate-300"
          >
            <RefreshCw aria-hidden="true" className={cn("size-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {isPending && <Cargando />}
      {isError && (
        <Card className="flex flex-col items-start gap-3 rounded-2xl border-border bg-white p-5 dark:bg-surface-low">
          <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
            {mensajeDeErrorApi(error, "No se pudo cargar el resumen del día.")}
          </p>
          <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching} className="rounded-xl font-bold">
            Reintentar
          </Button>
        </Card>
      )}
      {resumen && <Bloques resumen={resumen} />}
    </section>
  );
}
