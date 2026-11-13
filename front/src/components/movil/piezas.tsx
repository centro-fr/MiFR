import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEnAppMovil } from "@/components/layout/en-app-movil";
import { cn } from "@/utils/cn";
import { inicialesDeNombre } from "@/utils/texto";

// Piezas que comparten las pantallas de la profesora y del alumno (diseño mobile del canvas).

/** Caja blanca con borde: tarjetas y listas. */
export const CAJA = "rounded-xl border border-border bg-card";

/** Fila de una lista dentro de CAJA. */
export const FILA = "border-b border-border last:border-b-0";

export function EncabezadoPantalla({ titulo, detalle, accion }: { titulo: string; detalle?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-7 font-extrabold tracking-tight text-foreground md:text-2xl md:font-black xl:text-3xl">{titulo}</h1>
        {detalle && <p className="mt-0.5 text-sm text-muted-foreground">{detalle}</p>}
      </div>
      {accion}
    </div>
  );
}

const TAMANOS = { chico: "size-8 text-xs", medio: "size-9 text-[13px]", grande: "size-14 text-xl font-extrabold" } as const;

export function AvatarIniciales({ nombre, tamano = "medio" }: { nombre: string; tamano?: keyof typeof TAMANOS }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-pink-100 font-bold text-primary-dark ring-1 ring-pink-200 ring-inset dark:bg-primary/20 dark:text-pink-200 dark:ring-primary/30",
        TAMANOS[tamano],
      )}
    >
      {inicialesDeNombre(nombre)}
    </span>
  );
}

interface OpcionSegmentada<T extends string> {
  id: T;
  etiqueta: string;
}

interface PropsSegmentado<T extends string> {
  opciones: OpcionSegmentada<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
  etiqueta: string;
  /** "radio" dentro de un formulario; "tab" para filtrar una lista. */
  tipo?: "tab" | "radio";
}

/** Dos o más opciones excluyentes en una pastilla gris (Todos/Deben, Efectivo/Transferencia). */
export function ControlSegmentado<T extends string>({ opciones, valor, onCambiar, etiqueta, tipo = "tab" }: PropsSegmentado<T>) {
  return (
    <div
      role={tipo === "tab" ? "tablist" : "radiogroup"}
      aria-label={etiqueta}
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
      className="grid gap-0.5 rounded-xl bg-slate-200/70 p-[3px] dark:bg-white/10"
    >
      {opciones.map((opcion) => {
        const elegida = opcion.id === valor;
        return (
          <button
            key={opcion.id}
            type="button"
            role={tipo}
            aria-selected={tipo === "tab" ? elegida : undefined}
            aria-checked={tipo === "radio" ? elegida : undefined}
            onClick={() => onCambiar(opcion.id)}
            className={cn(
              "h-9 rounded-lg text-sm transition-colors",
              elegida
                ? "bg-card font-bold text-foreground shadow-xs"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** Lista de pares etiqueta/valor (Teléfono, Email…), con el valor a la derecha. */
export function DatosEnFilas({ filas }: { filas: { etiqueta: string; valor: ReactNode }[] }) {
  return (
    <dl className={cn(CAJA, "grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 p-4 text-sm")}>
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="contents">
          <dt className="text-muted-foreground">{fila.etiqueta}</dt>
          <dd className="text-right font-semibold [overflow-wrap:anywhere]">{fila.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AvisoVacio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-card px-4 py-5 text-center text-sm text-muted-foreground dark:border-slate-700">
      {children}
    </p>
  );
}

/** Volver de una pantalla de detalle. En el celular no hace falta: la barra superior trae la flecha. */
export function EnlaceVolver({ to, children }: { to: string; children: string }) {
  if (useEnAppMovil()) return null;
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
