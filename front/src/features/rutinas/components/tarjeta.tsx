import type { ReactNode } from "react";
import { AlertCircle, Plus, type LucideIcon } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Base de las dos tarjetas de la pestaña "Rutina y progreso": mismo estilo que las de la ficha.

interface PropsTarjeta {
  id: string;
  titulo: string;
  icono: LucideIcon;
  /** El botón de carga del encabezado; null sin permiso o con el alumno dado de baja. */
  accion: ReactNode;
  children: ReactNode;
}

export function Tarjeta({ id, titulo, icono: Icono, accion, children }: PropsTarjeta) {
  return (
    <Card
      role="region"
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-4 rounded-2xl border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
          <Icono aria-hidden="true" className="size-5 text-primary" />
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </Card>
  );
}

export function BotonDeCarga({ texto, onClick, principal = false }: { texto: string; onClick: () => void; principal?: boolean }) {
  return (
    <Button
      type="button"
      variant={principal ? "default" : "outline"}
      onClick={onClick}
      className={principal ? "min-h-11 rounded-xl bg-primary font-extrabold text-white hover:bg-primary-dark" : "min-h-11 rounded-xl font-bold"}
    >
      {principal && <Plus aria-hidden="true" />}
      {texto}
    </Button>
  );
}

export function CargandoTarjeta({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta} className="space-y-3">
      <Skeleton className="h-6 w-2/3 rounded-lg" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

interface PropsError {
  error: unknown;
  mensaje: string;
  reintentando: boolean;
  onReintentar: () => void;
}

export function ErrorDeCarga({ error, mensaje, reintentando, onReintentar }: PropsError) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
        <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
        {mensajeDeErrorApi(error, mensaje)}
      </p>
      <Button type="button" variant="outline" disabled={reintentando} onClick={onReintentar} className="min-h-11 rounded-xl font-bold">
        Reintentar
      </Button>
    </div>
  );
}

/** Estado vacío: qué falta y, si se puede, el botón para cargarlo. */
export function SinDatos({ texto, accion }: { texto: string; accion: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{texto}</p>
      {accion}
    </div>
  );
}
