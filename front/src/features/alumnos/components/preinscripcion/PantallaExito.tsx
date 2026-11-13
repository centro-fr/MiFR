import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PantallaExitoProps {
  yaAbono: boolean;
  onCargarOtro: () => void;
  onVerFicha: () => void;
}

export function PantallaExito({ yaAbono, onCargarOtro, onVerFicha }: PantallaExitoProps) {
  return (
    <div className="py-10 sm:py-14 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in duration-300">
      {/* Icono Check Verde en Círculo Menta Suave */}
      <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
        <Check className="size-8 stroke-[3]" />
      </div>

      {/* Título y Subtítulo */}
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {yaAbono ? "Alta confirmada" : "Pre-inscripción guardada"}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {yaAbono
            ? "El cobro fue registrado y el alumno ya se encuentra activo."
            : "Queda pendiente de alta hasta el primer cobro."}
        </p>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCargarOtro}
          className="h-11 px-5 rounded-xl text-xs sm:text-sm font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          Cargar otro alumno
        </Button>
        <Button
          type="button"
          onClick={onVerFicha}
          className="h-11 px-6 rounded-xl text-xs sm:text-sm font-bold bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
        >
          Ver ficha
        </Button>
      </div>
    </div>
  );
}
