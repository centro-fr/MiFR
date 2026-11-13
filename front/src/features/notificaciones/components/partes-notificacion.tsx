import type { TipoNotificacion } from "@/features/notificaciones/schemas/notificaciones";
import { fechaCompleta, haceCuanto, PRESENTACION_POR_TIPO } from "@/features/notificaciones/utils/presentacion";
import { cn } from "@/utils/cn";

// Lo que comparten la campana y la bandeja al mostrar un aviso.

export function IconoNotificacion({ tipo, className }: { tipo: TipoNotificacion; className?: string }) {
  const { icono: Icono, tono } = PRESENTACION_POR_TIPO[tipo];
  return (
    <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tono, className)}>
      <Icono className="size-4.5" />
    </span>
  );
}

export function MomentoNotificacion({ fecha }: { fecha: string }) {
  return (
    <time dateTime={fecha} title={fechaCompleta(fecha)} className="text-xs text-muted-foreground">
      {haceCuanto(fecha)}
    </time>
  );
}

/** El punto de "sin leer". El texto queda para los lectores de pantalla. */
export function MarcaSinLeer({ className }: { className?: string }) {
  return (
    <span className={cn("size-2 shrink-0 rounded-full bg-primary", className)}>
      <span className="sr-only">Sin leer</span>
    </span>
  );
}
