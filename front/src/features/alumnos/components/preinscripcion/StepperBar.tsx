import { Fragment } from "react";
import { Check, User, Dumbbell, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";
import type { PasoPreinscripcion } from "../../hooks/use-preinscripcion";

interface StepperBarProps {
  pasoActual: PasoPreinscripcion;
  irAPaso?: (paso: PasoPreinscripcion) => void;
}

const PASOS = [
  { id: 1 as const, titulo: "Datos Personales", tituloCorto: "Datos", icono: User },
  { id: 2 as const, titulo: "Plan y Profesora", tituloCorto: "Plan", icono: Dumbbell },
  { id: 3 as const, titulo: "Horarios", tituloCorto: "Horarios", icono: Calendar },
  { id: 4 as const, titulo: "Confirmación", tituloCorto: "Confirmar", icono: CheckCircle2 },
];

export function StepperBar({ pasoActual }: StepperBarProps) {
  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between">
        {PASOS.map((p, idx) => {
          const Icon = p.icono;
          const esCompletado = pasoActual > p.id;
          const esActivo = pasoActual === p.id;

          return (
            <Fragment key={p.id}>
              {/* Nodo del paso */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={cn(
                    "flex size-8 sm:size-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
                    esCompletado && "bg-primary text-primary-foreground shadow-sm",
                    esActivo && "bg-primary/10 border-2 border-primary text-primary font-bold dark:bg-primary/20",
                    !esCompletado && !esActivo && "bg-muted text-muted-foreground border border-border/50",
                  )}
                  aria-current={esActivo ? "step" : undefined}
                >
                  {esCompletado ? <Check className="size-3.5 sm:size-4 stroke-[3]" /> : <Icon className="size-3.5 sm:size-4" />}
                </div>
                <span
                  className={cn(
                    "text-[11px] sm:text-xs text-center font-medium transition-colors",
                    esActivo ? "text-primary font-semibold" : "text-muted-foreground",
                  )}
                >
                  <span className="hidden sm:inline">{p.titulo}</span>
                  <span className="inline sm:hidden">{p.tituloCorto}</span>
                </span>
              </div>

              {/* Conector entre pasos */}
              {idx < PASOS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors duration-200 -mt-6",
                    pasoActual > p.id ? "bg-primary" : "bg-border/60",
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
