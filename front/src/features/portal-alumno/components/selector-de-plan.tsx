import { ChevronDown, Tag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import type { PlanDelAlumno } from "../schemas/panel-alumno";
import { usePlanElegido } from "../hooks/use-plan-elegido";
import { etiquetaDelPlan, hayOtroPlanConAlerta } from "../utils/plan-del-panel";

function diaYMes(fecha: string): string {
  const [, mes, dia] = fecha.slice(0, 10).split("-");
  return dia && mes ? `${dia}/${mes}` : "";
}

function detalleDelPlan(plan: PlanDelAlumno): string {
  const vence = diaYMes(plan.fecha_vencimiento);
  const textoVence = plan.estado_cuota === "VENCIDA" ? `Venció ${vence}` : vence ? `Vence ${vence}` : "";
  return [plan.nombre, textoVence].filter(Boolean).join(" · ");
}

export function PuntoAlerta({ estado }: { estado: PlanDelAlumno["estado_cuota"] }) {
  if (estado === "AL_DIA") return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        estado === "VENCIDA" ? "bg-red-500" : "bg-amber-400",
      )}
    />
  );
}

/**
 * Selector de plan en la barra superior cuando el alumno tiene 2 o más inscripciones vigentes.
 * Con 0 o 1 plan no se muestra.
 */
export function SelectorDePlan({ sobreFondoOscuro = false }: { sobreFondoOscuro?: boolean }) {
  const { planes, elegido, elegirPlan } = usePlanElegido();
  if (planes.length < 2 || !elegido) return null;

  const tituloElegido = etiquetaDelPlan(elegido);
  const otroConAlerta = hayOtroPlanConAlerta(planes, elegido.id_inscripcion);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Viendo el plan ${tituloElegido}. Cambiar`}
          className={cn(
            "flex h-9 max-w-[44vw] shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors cursor-pointer",
            sobreFondoOscuro
              ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
              : "border-border bg-card text-foreground hover:bg-slate-100 dark:hover:bg-white/10",
          )}
        >
          <Tag
            aria-hidden="true"
            className={cn("size-4 shrink-0", sobreFondoOscuro ? "text-pink-300" : "text-primary dark:text-pink-300")}
          />
          <span className="truncate">{tituloElegido}</span>
          {otroConAlerta && (
            <>
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-amber-400" />
              <span className="sr-only">(tenés otro plan con cuota pendiente)</span>
            </>
          )}
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-60">
        <DropdownMenuLabel>Elegí qué plan ver</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(elegido.id_inscripcion)}
          onValueChange={(valor) => elegirPlan(Number(valor))}
        >
          {planes.map((plan) => (
            <DropdownMenuRadioItem key={plan.id_inscripcion} value={String(plan.id_inscripcion)} className="min-h-11 py-2">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{etiquetaDelPlan(plan)}</div>
                  <div className="truncate text-xs text-muted-foreground">{detalleDelPlan(plan)}</div>
                </div>
                <PuntoAlerta estado={plan.estado_cuota} />
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

