import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { cn } from "@/utils/cn";

// Piezas que comparten las pestañas de Reportes: mismas tarjetas, tablas, estados y filtros que el
// informe de asistencia, para que todos los reportes se vean iguales.

export const TH = "px-3 py-2.5 text-left text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400";
export const TH_NUMERO = `${TH} text-right`;
export const TD = "border-t border-slate-100 px-3 py-2.5 dark:border-slate-800";
export const TD_NUMERO = `${TD} text-right tabular-nums whitespace-nowrap`;

export interface DatoResumen {
  etiqueta: string;
  valor: string;
  nota?: string;
}

/** La última tarjeta va destacada, como en el informe de asistencia. */
export function ResumenEnTarjetas({ datos, aclaracion }: { datos: DatoResumen[]; aclaracion?: string }) {
  return (
    <section aria-label="Resumen">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {datos.map(({ etiqueta, valor, nota }, indice) => {
          const destacada = indice === datos.length - 1;
          return (
            <div
              key={etiqueta}
              className={
                destacada
                  ? // Rosa oscuro y no el rosa de marca: el texto blanco chico necesita contraste 4,5:1.
                    "rounded-lg bg-primary-dark p-4 text-white shadow-md shadow-primary/20"
                  : "rounded-lg border border-slate-200/80 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-900"
              }
            >
              <dt className={destacada ? "text-sm font-semibold text-white/90" : "text-sm font-semibold text-slate-500 dark:text-slate-400"}>{etiqueta}</dt>
              <dd className="mt-1 text-2xl font-black break-words tabular-nums">{valor}</dd>
              {nota && <dd className={destacada ? "mt-0.5 text-xs text-white/90" : "mt-0.5 text-xs text-slate-500 dark:text-slate-400"}>{nota}</dd>}
            </div>
          );
        })}
      </dl>
      {aclaracion && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{aclaracion}</p>}
    </section>
  );
}

export function SeccionReporte({ id, titulo, descripcion, children }: { id: string; titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <Card
      role="region"
      aria-labelledby={id}
      className="rounded-lg border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5 dark:border-slate-700/80 dark:bg-slate-900"
    >
      <h2 id={id} className="text-base font-extrabold text-slate-900 dark:text-white">
        {titulo}
      </h2>
      {descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function TituloDelReporte({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div>
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl dark:text-white">{titulo}</h2>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{detalle}</p>
    </div>
  );
}

export function CargandoReporte() {
  return (
    <div aria-busy="true" aria-label="Cargando el informe" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((indice) => (
          <Skeleton key={indice} className="h-24 rounded-lg" />
        ))}
      </div>
      <TablaSkeleton ariaLabel="Cargando tabla de informe" filas={5} />
    </div>
  );
}

export function ErrorDelReporte({ error, reintentando, onReintentar }: { error: unknown; reintentando: boolean; onReintentar: () => void }) {
  return (
    <EstadoErrorCarga
      titulo="Error al generar el informe"
      mensaje={mensajeDeErrorApi(error, "No se pudo generar el informe.")}
      reintentando={reintentando}
      onReintentar={onReintentar}
    />
  );
}

export function ReporteVacio({ icono: _icono, titulo, texto }: { icono?: ReactNode; titulo: string; texto: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 rounded-lg border-slate-200 px-5 py-14 text-center shadow-xs dark:border-slate-800">
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{titulo}</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{texto}</p>
    </Card>
  );
}

interface PropsPaginacion {
  etiqueta: string;
  offset: number;
  total: number;
  porPagina: number;
  cargando: boolean;
  onCambiar: (offset: number) => void;
}

export function PaginacionReporte({ etiqueta, offset, total, porPagina, cargando, onCambiar }: PropsPaginacion) {
  if (total <= porPagina) return null;
  const hasta = Math.min(offset + porPagina, total);
  return (
    <nav aria-label={etiqueta} className="mt-3 flex items-center justify-between gap-2">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {offset + 1}–{hasta} de {total}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={cargando || offset === 0} onClick={() => onCambiar(Math.max(offset - porPagina, 0))} className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200">
          <ChevronLeft aria-hidden="true" className="mr-1 size-3.5" />
          Anterior
        </Button>
        <Button type="button" variant="outline" disabled={cargando || hasta >= total} onClick={() => onCambiar(offset + porPagina)} className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200">
          Siguiente
          <ChevronRight aria-hidden="true" className="ml-1 size-3.5" />
        </Button>
      </div>
    </nav>
  );
}

/** Barra chica con el porcentaje al lado, para comparar filas de un vistazo. */
export function BarraPorcentaje({ valor, texto, tono = "bg-primary" }: { valor: number; texto: string; tono?: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-2.5">
      <span aria-hidden="true" className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <span className={cn("block h-full rounded-full", tono)} style={{ width: `${Math.min(Math.max(valor, 0), 100)}%` }} />
      </span>
      <span className="w-14 text-right font-bold text-slate-900 tabular-nums dark:text-white">{texto}</span>
    </span>
  );
}

const CONTROL =
  "h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
export const ETIQUETA_FILTRO = "text-xs font-bold text-slate-700 dark:text-slate-300";
export const CONTROL_FILTRO = CONTROL;

interface PropsSelect {
  id: string;
  etiqueta: string;
  valor: string;
  todos: string;
  opciones: { valor: string; texto: string }[];
  onChange: (valor: string) => void;
}

/** Un filtro que se aplica al elegir: no hace falta "Generar informe" para algo tan rápido. */
export function SelectFiltro({ id, etiqueta, valor, todos, opciones, onChange }: PropsSelect) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={ETIQUETA_FILTRO}>
        {etiqueta}
      </label>
      <SelectorDesplegable
        id={id}
        valor={valor}
        todos={todos}
        opciones={opciones}
        onChange={onChange}
        variante="formulario"
      />
    </div>
  );
}

// Los filtros van sobre el fondo de la página: una tarjeta alrededor de inputs con borde se ve como
// un doble borde.
export function GrupoDeFiltros({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
