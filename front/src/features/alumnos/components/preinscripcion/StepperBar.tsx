import { cn } from "@/utils/cn";

export type PasoPreinscripcion = 1 | 2 | 3;

interface StepperBarProps {
  pasoActual: PasoPreinscripcion;
  irAPaso?: (paso: PasoPreinscripcion) => void;
}

const PASOS = [
  { id: 1 as const, titulo: "1. Alumno" },
  { id: 2 as const, titulo: "2. Plan y horarios" },
  { id: 3 as const, titulo: "3. Confirmar" },
];

export function StepperBar({ pasoActual, irAPaso }: StepperBarProps) {
  return (
    <div className="w-full py-2">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {PASOS.map((p) => {
          const esActivoOCompletado = pasoActual >= p.id;
          const esActivo = pasoActual === p.id;
          const puedeNavegar = irAPaso && pasoActual > p.id;

          return (
            <div
              key={p.id}
              onClick={() => {
                if (puedeNavegar) irAPaso(p.id);
              }}
              className={cn(
                "flex flex-col gap-2 transition-all",
                puedeNavegar && "cursor-pointer group",
              )}
            >
              {/* Barra indicadora superior */}
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  esActivoOCompletado
                    ? "bg-primary"
                    : "bg-slate-200 dark:bg-slate-800",
                )}
              />

              {/* Texto del paso */}
              <span
                className={cn(
                  "text-xs sm:text-sm font-semibold tracking-tight transition-colors text-left",
                  esActivo
                    ? "text-slate-900 dark:text-slate-100 font-bold"
                    : esActivoOCompletado
                    ? "text-slate-800 dark:text-slate-200"
                    : "text-slate-400 dark:text-slate-500 font-medium",
                  puedeNavegar && "group-hover:text-primary",
                )}
              >
                {p.titulo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
