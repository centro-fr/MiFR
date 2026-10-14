import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sumarDias } from "@/features/asistencia/utils/formato-clase";

interface NavegadorFechaProps {
  fecha: string;
  /** Hoy en Argentina: no hay asistencia que consultar de días futuros. */
  hoy: string;
  onChange: (fecha: string) => void;
}

const CLASE_FLECHA = "size-10 min-h-0 shrink-0 rounded-xl border-border bg-card p-0 pointer-coarse:size-11";

/** Día anterior, fecha elegida y día siguiente; "Hoy" vuelve al día actual. */
export function NavegadorFecha({ fecha, hoy, onChange }: NavegadorFechaProps) {
  const esHoy = fecha >= hoy;
  return (
    <div role="group" aria-label="Fecha de las clases" className="flex items-center gap-2">
      <Button type="button" variant="outline" onClick={() => onChange(sumarDias(fecha, -1))} aria-label="Día anterior" className={CLASE_FLECHA}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <input
        type="date"
        aria-label="Elegir fecha"
        value={fecha}
        max={hoy}
        // Mientras se escribe a mano el valor queda vacío: recién se navega con una fecha completa.
        onChange={(evento) => evento.target.value && onChange(evento.target.value)}
        className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pointer-coarse:h-11 sm:w-40 sm:flex-none"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(sumarDias(fecha, 1))}
        disabled={esHoy}
        aria-label="Día siguiente"
        className={CLASE_FLECHA}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
      {!esHoy && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(hoy)}
          className="h-10 min-h-0 shrink-0 rounded-xl border-primary/40 bg-card px-3.5 text-sm font-bold text-primary hover:bg-pink-50 hover:text-primary-dark pointer-coarse:h-11 dark:text-pink-300 dark:hover:bg-primary/15"
        >
          Hoy
        </Button>
      )}
    </div>
  );
}
