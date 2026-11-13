import { useEffect, useState } from "react";
import { ChevronDown, UsersRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { useAlumnoElegido } from "../hooks/use-alumno-elegido";
import { usePlanElegido } from "../hooks/use-plan-elegido";
import { estadoAlertaOtroPlan, etiquetaDelPlan } from "../utils/plan-del-panel";
import { PuntoAlerta } from "./selector-de-plan";

/**
 * En la barra superior, para el tutor: elige de quién ver los datos (sus menores y, si también entrena, él
 * mismo) y la elección vale para todas las pantallas del portal. Con un solo alumno no se muestra.
 */
export function SelectorDeAlumno({ sobreFondoOscuro = false }: { sobreFondoOscuro?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [esperandoPlanesDe, setEsperandoPlanesDe] = useState<number | null>(null);
  const { alumnos, elegido, elegirAlumno } = useAlumnoElegido();
  const { consulta, planes, elegido: planElegido, elegirPlan } = usePlanElegido();

  useEffect(() => {
    if (esperandoPlanesDe === null || !elegido || elegido.id !== esperandoPlanesDe || consulta.isFetching) return;
    setEsperandoPlanesDe(null);
    if (planes.length < 2) setAbierto(false);
  }, [esperandoPlanesDe, elegido, consulta.isFetching, planes.length]);

  if (alumnos.length < 2 || !elegido) return null;
  const estadoOtroPlan = planElegido ? estadoAlertaOtroPlan(planes, planElegido.id_inscripcion) : "AL_DIA";
  return (
    <DropdownMenu open={abierto} onOpenChange={setAbierto}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Viendo los datos de ${elegido.propio ? "vos" : `${elegido.nombre} ${elegido.apellido}`}. Cambiar`}
          className={cn(
            "flex h-9 max-w-[42vw] shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
            // Neutro como los demás botones de la barra; el rosa queda solo en el ícono.
            sobreFondoOscuro
              ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
              : "border-border bg-card text-foreground hover:bg-slate-100 dark:hover:bg-white/10",
          )}
        >
          <UsersRound aria-hidden="true" className={cn("size-4 shrink-0", sobreFondoOscuro ? "text-pink-300" : "text-primary dark:text-pink-300")} />
          <span className="truncate">
            {elegido.nombre}
            <span className="hidden sm:inline"> {elegido.apellido}</span>
            {elegido.propio && " (vos)"}
            {planes.length >= 2 && planElegido && (
              <span className="hidden md:inline font-normal opacity-75"> · {etiquetaDelPlan(planElegido)}</span>
            )}
          </span>
          <PuntoAlerta estado={estadoOtroPlan} />
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-56">
        <DropdownMenuLabel>Ver los datos de</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(elegido.id)} onValueChange={(valor) => elegirAlumno(Number(valor))}>
          {alumnos.map((alumno) => (
            <DropdownMenuRadioItem
              key={alumno.id}
              value={String(alumno.id)}
              className="min-h-10"
              onSelect={(e) => {
                e.preventDefault();
                setEsperandoPlanesDe(alumno.id);
              }}
            >
              {alumno.nombre} {alumno.apellido}
              {alumno.propio && " (vos)"}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {planes.length >= 2 && planElegido && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              Plan de {elegido.nombre} {elegido.apellido}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(planElegido.id_inscripcion)}
              onValueChange={(valor) => elegirPlan(Number(valor))}
            >
              {planes.map((plan) => (
                <DropdownMenuRadioItem key={plan.id_inscripcion} value={String(plan.id_inscripcion)} className="min-h-10">
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{etiquetaDelPlan(plan)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{plan.nombre}</span>
                      <PuntoAlerta estado={plan.estado_cuota} />
                    </div>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
