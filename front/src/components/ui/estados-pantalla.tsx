import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

export interface TablaSkeletonProps {
  /** Cantidad de filas a mostrar. Por defecto 5. */
  filas?: number;
  /** Cantidad de pestañas en desktop. Si se omite o es 0, no muestra cabecera de tabs. */
  cantidadPestanas?: number;
  /** Si debe incluir la tarjeta externa con borde y fondo blanco/oscuro. Por defecto true. */
  conTarjeta?: boolean;
  /** Etiqueta accesible para lectores de pantalla. */
  ariaLabel?: string;
  className?: string;
}

export function TablaSkeleton({
  filas = 5,
  cantidadPestanas = 0,
  conTarjeta = true,
  ariaLabel = "Cargando contenido...",
  className,
}: TablaSkeletonProps) {
  const contenido = (
    <div role="status" aria-label={ariaLabel} className={cn("w-full", className)}>
      <span className="sr-only">{ariaLabel}</span>
      {cantidadPestanas > 0 && (
        <div className="hidden lg:flex items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
          {Array.from({ length: cantidadPestanas }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-lg" />
          ))}
        </div>
      )}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: filas }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="hidden md:block h-4 w-24" />
            <Skeleton className="hidden sm:block h-4 w-28" />
            <Skeleton className="hidden lg:block h-4 w-20" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!conTarjeta) {
    return contenido;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
      {contenido}
    </div>
  );
}

export interface EstadoErrorCargaProps {
  titulo?: string;
  mensaje: string;
  reintentando?: boolean;
  onReintentar?: () => void;
  textoReintentar?: string;
  accionSecundaria?: ReactNode;
  className?: string;
}

export function EstadoErrorCarga({
  titulo,
  mensaje,
  reintentando = false,
  onReintentar,
  textoReintentar = "Reintentar",
  accionSecundaria,
  className,
}: EstadoErrorCargaProps) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border-slate-200/80 bg-white px-5 py-12 text-center shadow-2xs dark:border-slate-700/80 dark:bg-slate-900",
        className
      )}
    >
      <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
      {titulo && (
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
          {titulo}
        </h2>
      )}
      <p role="alert" className="max-w-md text-sm font-semibold text-slate-700 dark:text-slate-200">
        {mensaje}
      </p>
      {onReintentar && (
        <Button
          type="button"
          disabled={reintentando}
          onClick={onReintentar}
          className="min-h-[40px] rounded-lg bg-primary px-5 font-bold text-white hover:bg-primary-dark"
        >
          {textoReintentar}
        </Button>
      )}
      {accionSecundaria}
    </Card>
  );
}

