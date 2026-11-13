import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { inicialesDeNombre } from "@/utils/texto";

interface FilaMovilProps {
  titulo: ReactNode;
  /**
   * Los datos de las columnas de la tabla. Una lista va en una grilla de tres columnas, para que cada
   * dato se lea entero sin dejar la fila vacía a la derecha; un texto suelto, en una línea.
   */
  detalle?: ReactNode | ReactNode[];
  /** Un estado junto al título (vigente, abonada…). */
  insignia?: ReactNode;
  /** Nombre del que salen las iniciales del avatar; sin él, la fila no lleva avatar. */
  avatar?: string;
  acciones?: ReactNode;
  /** Tocar la fila hace lo mismo que su acción principal; las acciones siguen siendo los botones. */
  onAbrir?: () => void;
  /** Lo dado de baja se ve apagado, como en la tabla. */
  atenuada?: boolean;
}

/**
 * Una fila de la lista que reemplaza a la tabla en el celular: arriba el avatar opcional, el título y
 * una línea con el resto de las columnas; abajo, todas las acciones juntas.
 */
export function FilaMovil({ titulo, detalle, insignia, avatar, acciones, onAbrir, atenuada = false }: FilaMovilProps) {
  return (
    <li
      onClick={onAbrir}
      className={cn(
        "flex flex-col gap-3 px-4 py-3.5 transition-colors",
        onAbrir && "cursor-pointer hover:bg-pink-50/40 dark:hover:bg-slate-800/60",
        atenuada && "bg-slate-50/40 opacity-60 dark:bg-slate-900/40",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {avatar && (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300"
          >
            {inicialesDeNombre(avatar)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-white">{titulo}</div>
            {insignia && <div className="shrink-0">{insignia}</div>}
          </div>
          <Detalle detalle={detalle} />
        </div>
      </div>
      {acciones && (
        // Abajo y juntas, alineadas con el texto: así el contenido usa todo el ancho de la fila. Los
        // botones no disparan además el toque de la fila.
        <div className={cn("flex flex-wrap items-center gap-2", avatar && "pl-12")} onClick={(evento) => evento.stopPropagation()}>
          {acciones}
        </div>
      )}
    </li>
  );
}

function Detalle({ detalle }: { detalle: FilaMovilProps["detalle"] }) {
  if (!Array.isArray(detalle)) {
    return detalle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detalle}</p> : null;
  }
  const datos = detalle.filter((dato) => dato !== null && dato !== undefined && dato !== false && dato !== "");
  return (
    <ul className="mt-1 grid grid-cols-3 gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
      {datos.map((dato, indice) => (
        <li key={indice} className="min-w-0 break-words">
          {dato}
        </li>
      ))}
    </ul>
  );
}
