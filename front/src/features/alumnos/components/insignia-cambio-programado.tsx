import { ArrowLeftRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CambioPlanProgramado } from "@/features/alumnos/schemas/alumno";
import { fechaCalendarioCorta } from "@/utils/fecha";

interface Props {
  cambio: CambioPlanProgramado;
  soloIcono?: boolean;
}

/** Indicador minimalista y neutro para señalar que hay un cambio de plan programado. */
export function InsigniaCambioProgramado({ cambio, soloIcono = false }: Props) {
  const fecha = fechaCalendarioCorta(cambio.fecha_aplicacion);
  const descripcion = `Cambia a ${cambio.nombre_plan} el ${fecha}`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {soloIcono ? (
            <span
              tabIndex={0}
              aria-label={descripcion}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              <ArrowLeftRight aria-hidden="true" className="size-3" />
            </span>
          ) : (
            <span
              tabIndex={0}
              aria-label={descripcion}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ArrowLeftRight aria-hidden="true" className="size-3 shrink-0 text-slate-400 dark:text-slate-400" />
              <span>{cambio.nombre_plan}</span>
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent className="font-semibold">{descripcion}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
