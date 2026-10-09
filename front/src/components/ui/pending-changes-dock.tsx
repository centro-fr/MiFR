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
      <div className="flex items-center gap-3 rounded-2xl bg-dark text-white shadow-2xl border border-white/10 pl-4 pr-2.5 py-2.5">
        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />

        <p className="min-w-0 flex-1 text-sm leading-snug">
          <span className="block font-bold truncate">
            {cantidad === 1 ? "1 cambio sin guardar" : `${cantidad} cambios sin guardar`}
          </span>
          <span className="block font-medium text-slate-300 truncate">Se aplican al guardar</span>
        </p>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDescartar}
            disabled={guardando}
            aria-live="polite"
            className={cn(
              "h-auto min-h-[44px] rounded-xl px-3 text-sm font-bold disabled:cursor-not-allowed",
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
            className="inline-flex h-auto min-h-[44px] items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-wait [&_svg]:size-3.5"
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
