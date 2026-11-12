import { Link, useNavigate } from "react-router-dom";
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
import { IconoNotificacion, MarcaSinLeer, MomentoNotificacion } from "@/features/notificaciones/components/partes-notificacion";
import {
  NOTIFICACIONES_EN_LA_CAMPANA,
  NOTIFICACIONES_POR_PAGINA,
  useMarcarNotificacionLeida,
  useMarcarTodasLeidas,
  useMisNotificaciones,
} from "@/features/notificaciones/hooks/use-notificaciones";
import type { Notificacion } from "@/features/notificaciones/schemas/notificaciones";
import { destinoDe, etiquetaSinLeer } from "@/features/notificaciones/utils/presentacion";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { cn } from "@/utils/cn";

// Más de esto no entra en el globito: el número exacto está en la bandeja.
const MAXIMO_EN_EL_CONTADOR = 9;

function ContadorSinLeer({ cantidad, sobreFondoOscuro }: { cantidad: number; sobreFondoOscuro: boolean }) {
  if (cantidad === 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-1.5 right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-black text-white ring-2 tabular-nums",
        sobreFondoOscuro ? "ring-dark" : "ring-bg-light dark:ring-canvas",
      )}
    >
      {cantidad > MAXIMO_EN_EL_CONTADOR ? `${MAXIMO_EN_EL_CONTADOR}+` : cantidad}
    </span>
  );
}

function ItemNotificacion({ notificacion, onAbrir }: { notificacion: Notificacion; onAbrir: (n: Notificacion) => void }) {
  return (
    <DropdownMenuItem onSelect={() => onAbrir(notificacion)} className="items-start gap-3 rounded-lg px-3 py-2.5">
      <IconoNotificacion tipo={notificacion.tipo} />
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
      {!notificacion.leida && <MarcaSinLeer className="mt-1.5" />}
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
// marca leído y lleva a la pantalla donde se resuelve; el resto, en la bandeja.
/** `sobreFondoOscuro`: en la barra superior oscura del celular (profesora y alumno). */
export function CampanaNotificaciones({ sobreFondoOscuro = false }: { sobreFondoOscuro?: boolean }) {
  const navigate = useNavigate();
  const { roles } = usePermissions();
  // La misma primera página que la bandeja: comparten la caché, así la campana nunca cuenta otra cosa
  // que la lista que se ve al tocar "Ver todas".
  const { data, isPending, isError, refetch, isFetching } = useMisNotificaciones(NOTIFICACIONES_POR_PAGINA);
  const ultimas = data?.datos.slice(0, NOTIFICACIONES_EN_LA_CAMPANA);
  const marcarLeida = useMarcarNotificacionLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const noLeidas = data?.no_leidas ?? 0;

  function abrir(notificacion: Notificacion) {
    if (!notificacion.leida) marcarLeida.mutate(notificacion.id_notificacion);
    const destino = destinoDe(notificacion.tipo, roles);
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
              className={cn(
                "relative h-11 w-11 cursor-pointer justify-center rounded-xl p-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                sobreFondoOscuro
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
              )}
            >
              <Bell aria-hidden="true" className="size-5 shrink-0" />
              <ContadorSinLeer cantidad={noLeidas} sobreFondoOscuro={sobreFondoOscuro} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Notificaciones</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl p-0">
        <div className="flex items-center justify-between gap-3 py-2 pr-1.5 pl-4">
          <div className="min-w-0 py-1">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Notificaciones</p>
            {noLeidas > 0 && <p className="text-xs text-muted-foreground">{etiquetaSinLeer(noLeidas)}</p>}
          </div>
          {noLeidas > 0 && (
            // preventDefault: el menú queda abierto y se ven las notificaciones ya leídas.
            <DropdownMenuItem
              disabled={marcarTodas.isPending}
              onSelect={(evento) => {
                evento.preventDefault();
                marcarTodas.mutate();
              }}
              className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-bold whitespace-nowrap text-primary-dark dark:text-pink-300"
            >
              <CheckCheck aria-hidden="true" />
              Marcar todas como leídas
            </DropdownMenuItem>
          )}
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
              {/* preventDefault: el menú queda abierto para ver si esta vez cargaron. */}
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
          {ultimas?.length === 0 && <SinNotificaciones />}
          {ultimas?.map((notificacion) => (
            <ItemNotificacion key={notificacion.id_notificacion} notificacion={notificacion} onAbrir={abrir} />
          ))}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <DropdownMenuItem asChild className="min-h-11 justify-center rounded-lg text-sm font-bold text-primary-dark dark:text-pink-300">
            <Link to="/app/notificaciones">Ver todas</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
