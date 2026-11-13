import { useState } from "react";
import { Search } from "lucide-react";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { BotonFiltrosMovil } from "@/components/ui/boton-filtros-movil";
import { CLASE_CONTROL } from "@/features/planes/components/estilos";
import { SIN_ACTIVIDAD, type EstadoFiltro, type FiltrosPlanes } from "@/features/planes/utils/planes";
import type { ActividadDelPlan } from "@/types/plan";
import { cn } from "@/utils/cn";

const ESTADOS: { valor: EstadoFiltro; texto: string }[] = [
  { valor: "VIGENTES", texto: "Vigentes" },
  { valor: "BAJA", texto: "Dados de baja" },
  { valor: "TODOS", texto: "Vigentes y de baja" },
];

// Las etiquetas quedan para el lector de pantalla: el ícono de búsqueda y el valor de cada
// selector ("Todas las actividades", "Vigentes") ya dicen qué filtran, y así la barra ocupa una fila.
const CLASE_ETIQUETA = "sr-only";

interface Props {
  filtros: FiltrosPlanes;
  actividades: ActividadDelPlan[];
  onChange: (cambio: Partial<FiltrosPlanes>) => void;
}

export function FiltrosPlanesBar({ filtros, actividades, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div role="search" aria-label="Filtrar planes" className="@container rounded-2xl border border-border bg-card p-3 shadow-sm">
      {/* Angosto, un control por fila: dos selectores lado a lado cortaban "Todas las actividades". */}
      <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2 @2xl:grid-cols-[minmax(0,1fr)_14rem_12rem]">
        <div className="min-w-0 @sm:col-span-2 @2xl:col-span-1">
          <label htmlFor="buscar-plan" className={CLASE_ETIQUETA}>
            Buscar
          </label>
          <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-plan"
              type="search"
              value={filtros.busqueda}
              onChange={(evento) => onChange({ busqueda: evento.target.value })}
              placeholder="Buscar plan o actividad…"
              className={cn(CLASE_CONTROL, "pl-9")}
            />
          </div>
          <BotonFiltrosMovil
            abierto={abierto}
            activos={filtros.idActividad !== "" || filtros.estado !== "VIGENTES"}
            onAlternar={() => setAbierto((v) => !v)}
            idPanel="filtros-planes-actividad filtros-planes-estado"
          />
          </div>
        </div>
        <div id="filtros-planes-actividad" className={cn("min-w-0", !abierto && "hidden xl:block")}>
          <label htmlFor="filtro-actividad" className={CLASE_ETIQUETA}>
            Actividad
          </label>
          <SelectorDesplegable
            id="filtro-actividad"
            aria-label="Actividad"
            valor={filtros.idActividad}
            opciones={[
              { valor: "", texto: "Todas las actividades" },
              { valor: SIN_ACTIVIDAD, texto: "Sirven para cualquier actividad" },
              ...actividades.map(({ id, nombre }) => ({ valor: id, texto: nombre })),
            ]}
            onChange={(v) => onChange({ idActividad: v })}
            variante="formulario"
          />
        </div>
        <div id="filtros-planes-estado" className={cn("min-w-0", !abierto && "hidden xl:block")}>
          <label htmlFor="filtro-estado" className={CLASE_ETIQUETA}>
            Estado
          </label>
          <SelectorDesplegable
            id="filtro-estado"
            aria-label="Estado"
            valor={filtros.estado}
            opciones={ESTADOS}
            onChange={(v) => onChange({ estado: v as EstadoFiltro })}
            variante="formulario"
          />
        </div>
      </div>
    </div>
  );
}
