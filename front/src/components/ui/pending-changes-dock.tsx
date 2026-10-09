import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface PendingChangesDockProps {
  cantidad: number;
  guardando: boolean;
  onGuardar: () => void;
  onDescartar: () => void;
}

/** Dock flotante inferior: único punto de confirmación de cambios pendientes.
 *  Descarte en dos pasos (toque para armar, segundo toque para descartar). */
export function PendingChangesDock({ cantidad, guardando, onGuardar, onDescartar }: PendingChangesDockProps) {
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleDescartar = () => {
    if (guardando) return;
    if (!confirmandoDescarte) {
      setConfirmandoDescarte(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setConfirmandoDescarte(false), 3500);
      return;
    }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setConfirmandoDescarte(false);
    onDescartar();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md animate-fadeIn"
    >
      {/* En mobile el mensaje y los botones van en filas separadas: en una sola fila los botones
          se llevaban todo el ancho y el mensaje quedaba truncado (y a 320 px el botón se salía). */}
      <div className="flex flex-col gap-2 rounded-2xl bg-dark text-white shadow-2xl border border-white/10 p-3 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5 sm:pl-4 sm:pr-2.5">
        <div className="flex min-w-0 items-center gap-3 sm:flex-1">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />

          <p className="min-w-0 flex-1 text-sm leading-snug">
            <span className="block font-bold truncate">
              {cantidad === 1 ? "1 cambio sin guardar" : `${cantidad} cambios sin guardar`}
            </span>
            <span className="block font-medium text-slate-300 truncate">Se aplican al guardar</span>
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0 sm:gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDescartar}
            disabled={guardando}
            aria-live="polite"
            className={cn(
              "h-auto min-h-[44px] flex-1 rounded-xl px-3 text-sm font-bold disabled:cursor-not-allowed sm:flex-none",
              confirmandoDescarte
                ? "text-red-300 hover:bg-white/10 hover:text-red-200"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            {confirmandoDescarte ? "¿Descartar?" : "Descartar"}
          </Button>

          <Button
            type="button"
            onClick={onGuardar}
            disabled={guardando}
            className="inline-flex h-auto min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 sm:flex-none text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-wait [&_svg]:size-3.5"
          >
            {guardando ? (
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check aria-hidden="true" className="h-3.5 w-3.5 stroke-[3]" />
            )}
            <span>{guardando ? "Guardando…" : "Guardar cambios"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
