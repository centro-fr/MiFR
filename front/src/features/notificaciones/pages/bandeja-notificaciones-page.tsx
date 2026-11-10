import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, CheckCheck, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { IconoNotificacion, MarcaSinLeer, MomentoNotificacion } from "@/features/notificaciones/components/partes-notificacion";
import {
  NOTIFICACIONES_POR_PAGINA,
  useMarcarNotificacionLeida,
  useMarcarTodasLeidas,
  useMisNotificaciones,
} from "@/features/notificaciones/hooks/use-notificaciones";
import type { Notificacion, PaginaNotificaciones } from "@/features/notificaciones/schemas/notificaciones";
import { destinoDe, etiquetaSinLeer, PRESENTACION_POR_TIPO } from "@/features/notificaciones/utils/presentacion";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { cn } from "@/utils/cn";

function FilaNotificacion({ notificacion }: { notificacion: Notificacion }) {
  const { roles } = usePermissions();
  const marcarLeida = useMarcarNotificacionLeida();
  const destino = destinoDe(notificacion.tipo, roles);
  const marcar = () => {
    if (!notificacion.leida) marcarLeida.mutate(notificacion.id_notificacion);
  };

  return (
    <li className={cn("flex gap-3 px-4 py-4 sm:px-5", !notificacion.leida && "bg-primary/5 dark:bg-primary/10")}>
      <IconoNotificacion tipo={notificacion.tipo} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {!notificacion.leida && <MarcaSinLeer />}
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {PRESENTACION_POR_TIPO[notificacion.tipo].etiqueta}
          </p>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            ·
          </span>
          <MomentoNotificacion fecha={notificacion.fecha_generacion} />
        </div>
        <p className={cn("text-sm text-slate-700 dark:text-slate-200", !notificacion.leida && "font-semibold text-slate-900 dark:text-white")}>
          {notificacion.mensaje}
        </p>
        {(destino || !notificacion.leida) && (
          <div className="flex flex-wrap items-center gap-x-4">
            {destino && (
              <Link
                to={destino.to}
                onClick={marcar}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary-dark transition-colors hover:text-primary dark:text-pink-300"
              >
                {destino.etiqueta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
            {!notificacion.leida && (
              <button
                type="button"
                onClick={marcar}
                disabled={marcarLeida.isPending}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Marcar como leída
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function Paginacion({ pagina, onCambiar }: { pagina: PaginaNotificaciones; onCambiar: (offset: number) => void }) {
  const desde = pagina.offset + 1;
  const hasta = pagina.offset + pagina.datos.length;
  const hayAnteriores = pagina.offset > 0;
  const haySiguientes = hasta < pagina.total;
  if (!hayAnteriores && !haySiguientes) return null;

  return (
    <nav aria-label="Páginas de notificaciones" className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
      <p className="text-sm text-muted-foreground tabular-nums">
        {desde}–{hasta} de {pagina.total}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={!hayAnteriores} onClick={() => onCambiar(pagina.offset - pagina.limit)} className="min-h-11 rounded-xl font-bold">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Más nuevas
        </Button>
        <Button type="button" variant="outline" disabled={!haySiguientes} onClick={() => onCambiar(pagina.offset + pagina.limit)} className="min-h-11 rounded-xl font-bold">
          Más viejas
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

function Bandeja({ pagina, onCambiarPagina }: { pagina: PaginaNotificaciones; onCambiarPagina: (offset: number) => void }) {
  const marcarTodas = useMarcarTodasLeidas();

  if (pagina.total === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 rounded-2xl border-border px-5 py-14 text-center">
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
          <Bell className="size-7" />
        </span>
        <h2 className="text-lg font-extrabold text-dark dark:text-white">No tenés notificaciones</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Cuando MiFR tenga algo para avisarte, como un vencimiento de cuota, lo vas a ver acá y en la campana.
        </p>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 dark:bg-surface-low">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {pagina.no_leidas > 0 ? etiquetaSinLeer(pagina.no_leidas) : "Todas leídas"}
          <span className="font-normal text-muted-foreground"> · {pagina.total} en total</span>
        </p>
        {pagina.no_leidas > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => marcarTodas.mutate()}
            disabled={marcarTodas.isPending}
            className="min-h-11 rounded-xl font-bold text-primary-dark hover:text-primary dark:text-pink-300"
          >
            <CheckCheck aria-hidden="true" className="size-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>
      <ul className="divide-y divide-border">
        {pagina.datos.map((notificacion) => (
          <FilaNotificacion key={notificacion.id_notificacion} notificacion={notificacion} />
        ))}
      </ul>
      <Paginacion pagina={pagina} onCambiar={onCambiarPagina} />
    </Card>
  );
}

function Contenido() {
  const [offset, setOffset] = useState(0);
  const { data, isPending, isError, error, refetch, isFetching } = useMisNotificaciones(NOTIFICACIONES_POR_PAGINA, offset);

  if (isPending) {
    return <TablaSkeleton ariaLabel="Cargando las notificaciones" filas={5} />;
  }
  if (isError && !data) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(error, "No se pudieron cargar las notificaciones.")}
        reintentando={isFetching}
        onReintentar={() => void refetch()}
      />
    );
  }
  return <Bandeja pagina={data} onCambiarPagina={setOffset} />;
}

// US-25 y US-26: los avisos que MiFR genera solo para cada persona (cuotas por vencer y vencidas,
// el resumen diario de la propietaria). La misma lista que la campana, completa y paginada.
export function BandejaNotificacionesPage() {
  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-dark xl:text-3xl dark:text-white">Notificaciones</h1>
            <p className="mt-1 text-sm leading-relaxed font-medium text-muted-foreground">
              Los avisos que MiFR genera solo. Por ahora llegan dentro del sistema, sin email ni WhatsApp.
            </p>
          </div>
          <Can permission="PARAMETROS_EDITAR">
            <Button asChild variant="outline" className="min-h-11 shrink-0 rounded-xl font-bold">
              <Link to="/app/notificaciones/configuracion">
                <Settings2 aria-hidden="true" className="size-4" />
                Configurar avisos
              </Link>
            </Button>
          </Can>
        </header>
        <Contenido />
      </div>
    </OwnerLayout>
  );
}
