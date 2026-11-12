import { useNavigate } from "react-router-dom";
import { AlertCircle, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MarcaSinLeer, MomentoNotificacion } from "@/features/notificaciones/components/partes-notificacion";
import {
  NOTIFICACIONES_POR_PAGINA,
  useMarcarNotificacionLeida,
  useMarcarTodasLeidas,
  useMisNotificaciones,
} from "@/features/notificaciones/hooks/use-notificaciones";
import type { Notificacion } from "@/features/notificaciones/schemas/notificaciones";
import { destinoDe, etiquetaSinLeer } from "@/features/notificaciones/utils/presentacion";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { cn } from "@/utils/cn";

// Más de esto no entra en el globito de la campana.
const MAXIMO_EN_EL_CONTADOR = 9;

function ContadorSinLeer({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute top-1.5 right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-black text-white ring-2 ring-bg-light tabular-nums dark:ring-canvas"
    >
      {cantidad > MAXIMO_EN_EL_CONTADOR ? `${MAXIMO_EN_EL_CONTADOR}+` : cantidad}
    </span>
  );
}

function ItemNotificacion({ notificacion, onAbrir }: { notificacion: Notificacion; onAbrir: (n: Notificacion) => void }) {
  return (
    <DropdownMenuItem onSelect={() => onAbrir(notificacion)} className="cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5">
      <span className="mt-1.5 flex size-2 shrink-0 items-center justify-center">
        {!notificacion.leida ? (
          <MarcaSinLeer />
        ) : (
          <span className="size-2 shrink-0 rounded-full bg-transparent" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug text-slate-700 dark:text-slate-200",
            !notificacion.leida && "font-semibold text-slate-900 dark:text-white",
          )}
        >
          {notificacion.mensaje}
        </p>
        <MomentoNotificacion fecha={notificacion.fecha_generacion} />
      </div>
    </DropdownMenuItem>
  );
}

function ListaCargando() {
  return (
    <div aria-busy="true" aria-label="Cargando las notificaciones" className="space-y-2 p-3">
      {[0, 1, 2].map((indice) => (
        <Skeleton key={indice} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

function SinNotificaciones() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">No tenés notificaciones</p>
    </div>
  );
}

// Barra superior: la campana con lo que la persona tiene sin leer y sus últimos avisos. Abrir uno lo
// marca leído y lleva a la pantalla donde se resuelve.
export function CampanaNotificaciones() {
  const navigate = useNavigate();
  const { roles } = usePermissions();
  const { data, isPending, isError, refetch, isFetching } = useMisNotificaciones(NOTIFICACIONES_POR_PAGINA);
  const notificaciones = data?.datos;
  const marcarLeida = useMarcarNotificacionLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const noLeidas = data?.no_leidas ?? 0;

  function abrir(notificacion: Notificacion) {
    if (!notificacion.leida) marcarLeida.mutate(notificacion.id_notificacion);
    const destino = destinoDe(notificacion, roles);
    if (destino) navigate(destino.to);
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={noLeidas > 0 ? `Notificaciones: ${etiquetaSinLeer(noLeidas)}` : "Notificaciones"}
              className="relative h-11 w-11 cursor-pointer justify-center rounded-xl p-0 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Bell aria-hidden="true" className="size-5 shrink-0" />
              <ContadorSinLeer cantidad={noLeidas} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Notificaciones</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl p-0">
        <div className="px-4 py-3">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">Notificaciones</p>
        </div>
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-[min(24rem,60dvh)] overflow-y-auto p-1.5">
          {isPending && <ListaCargando />}
          {isError && !data && (
            <>
              <p role="alert" className="flex items-center gap-2 px-3 pt-4 pb-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                No se pudieron cargar las notificaciones.
              </p>
              <DropdownMenuItem
                disabled={isFetching}
                onSelect={(evento) => {
                  evento.preventDefault();
                  void refetch();
                }}
                className="justify-center rounded-lg py-2 font-bold"
              >
                Reintentar
              </DropdownMenuItem>
            </>
          )}
          {notificaciones?.length === 0 && <SinNotificaciones />}
          {notificaciones?.map((notificacion) => (
            <ItemNotificacion key={notificacion.id_notificacion} notificacion={notificacion} onAbrir={abrir} />
          ))}
        </div>

        {noLeidas > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-1.5">
              <DropdownMenuItem
                disabled={marcarTodas.isPending}
                onSelect={(evento) => {
                  evento.preventDefault();
                  marcarTodas.mutate();
                }}
                className="min-h-10 cursor-pointer justify-center gap-1.5 rounded-lg text-sm font-bold text-primary focus:bg-primary/10 focus:text-primary"
              >
                <CheckCheck aria-hidden="true" className="size-4" />
                Marcar todas como leídas
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
