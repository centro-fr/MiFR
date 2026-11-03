import { useMemo } from "react";
import { Check, Dumbbell, Loader2 } from "lucide-react";
import { useActividades } from "@/features/actividades/hooks/use-actividades";
import { formatearEspecialidades } from "@/features/profesoras/schemas/profesora";
import { cn } from "@/utils/cn";

interface Props {
  seleccionadas: string[];
  onCambiar: (nuevas: string[]) => void;
  disabled?: boolean;
}

export function SelectorEspecialidades({ seleccionadas, onCambiar, disabled = false }: Props) {
  const { data: actividades = [], isPending, isError } = useActividades();

  const actividadesActivas = useMemo(
    () => actividades.filter((a) => a.activo),
    [actividades],
  );

  const textoResultante = formatearEspecialidades(seleccionadas);
  const caracteresUsados = textoResultante.length;

  const toggleActividad = (nombre: string) => {
    if (disabled) return;
    if (seleccionadas.includes(nombre)) {
      onCambiar(seleccionadas.filter((item) => item !== nombre));
    } else {
      const nuevaLista = [...seleccionadas, nombre];
      const nuevoTexto = formatearEspecialidades(nuevaLista);
      if (nuevoTexto.length <= 80) {
        onCambiar(nuevaLista);
      }
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs font-semibold text-slate-500">
        <Loader2 className="size-3.5 animate-spin text-primary" />
        Cargando actividades del centro...
      </div>
    );
  }

  if (isError || actividadesActivas.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic py-1">
        No se pudieron cargar las actividades o no hay actividades registradas.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {actividadesActivas.map((actividad) => {
          const estaSeleccionada = seleccionadas.includes(actividad.nombre);
          const posibleNuevoTexto = formatearEspecialidades([...seleccionadas, actividad.nombre]);
          const noEntra = !estaSeleccionada && posibleNuevoTexto.length > 80;

          return (
            <button
              key={actividad.id}
              type="button"
              disabled={disabled || noEntra}
              onClick={() => toggleActividad(actividad.nombre)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs select-none",
                estaSeleccionada
                  ? "border-primary bg-pink-50 text-primary dark:border-primary dark:bg-pink-950/50 dark:text-pink-200 ring-1 ring-primary/30"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50",
                noEntra && "opacity-40 cursor-not-allowed hover:border-slate-200 hover:bg-white",
              )}
            >
              {estaSeleccionada ? (
                <Check className="size-3.5 stroke-[2.5]" />
              ) : (
                <Dumbbell className="size-3.5 text-slate-400" />
              )}
              <span>{actividad.nombre}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
        <span>
          {seleccionadas.length === 0
            ? "Elegí una o más actividades para asignarle como especialidad."
            : `${seleccionadas.length} ${seleccionadas.length === 1 ? "actividad seleccionada" : "actividades seleccionadas"}`}
        </span>
        <span className={cn("font-semibold", caracteresUsados > 75 ? "text-amber-600 font-bold" : "text-slate-400")}>
          {caracteresUsados}/80
        </span>
      </div>
    </div>
  );
}

