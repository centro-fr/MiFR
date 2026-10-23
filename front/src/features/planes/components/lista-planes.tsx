import { Link } from "react-router-dom";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { BadgeEstadoPlan } from "@/features/planes/components/badges-plan";
import { estaVigente } from "@/features/planes/utils/planes";
import type { Plan } from "@/types/plan";
import { formatearPrecio } from "@/utils/moneda";
import { cn } from "@/utils/cn";

function fechaDiaMes(fecha: string): string {
  const [, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}`;
}

function textoFrecuenciaCard(plan: Plan): string {
  if (plan.tipo === "CLASE_SUELTA") return "1 clase suelta";
  if (plan.clasesPorSemana === null) return "Clases libres, sin tope";
  if (plan.clasesPorSemana === 1) return "1 clase por semana";
  return `${plan.clasesPorSemana} clases por semana`;
}

function textoActividadCard(plan: Plan): string {
  if (!plan.actividad) return "Cualquier actividad";
  return `Solo ${plan.actividad.nombre}`;
}

function textoProfesoraCard(plan: Plan): string {
  if (!plan.profesoraUnica) return "Con cualquier profesora";
  return "Solo con la profesora a cargo";
}

interface AccionesDeLaTarjeta {
  onActualizarPrecio: (plan: Plan) => void;
  onEditarPlan?: (plan: Plan) => void;
  onVerHistorial?: (plan: Plan) => void;
}

function TarjetaPlan({ plan, onActualizarPrecio, onEditarPlan, onVerHistorial }: { plan: Plan } & AccionesDeLaTarjeta) {
  const vigente = estaVigente(plan);
  return (
    <li
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-2xs hover:shadow-md transition-all gap-3.5",
        !vigente && "bg-muted/40 opacity-80",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {plan.nombre}
          </h2>
          {plan.precioProgramado ? (
            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-bold px-2.5 py-0.5 shrink-0">
              Sube el {fechaDiaMes(plan.precioProgramado.desde)}
            </span>
          ) : !vigente ? (
            <BadgeEstadoPlan vigente={false} />
          ) : null}
        </div>

        {/* Precio */}
        <div className="flex items-baseline justify-between gap-1.5 my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente)}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
              {plan.tipo === "MENSUAL" ? "por mes" : "por clase"}
            </span>
          </div>
          {onVerHistorial && (
            <button
              type="button"
              onClick={() => onVerHistorial(plan)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 font-medium"
            >
              Historial
            </button>
          )}
        </div>

        {/* Características */}
        <ul className="flex flex-col gap-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 my-2">
          <li>{textoFrecuenciaCard(plan)}</li>
          <li>{textoActividadCard(plan)}</li>
          <li>{textoProfesoraCard(plan)}</li>
        </ul>
      </div>

      {/* Botones de acción */}
      {vigente && (
        <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onActualizarPrecio(plan)}
            className="flex-1 h-10 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
          >
            Cambiar precio
            <span className="sr-only"> de {plan.nombre}</span>
          </Button>
          <Can permission="PLANES_EDITAR">
            {onEditarPlan ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onEditarPlan(plan)}
                className="px-4 h-10 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
              >
                Editar
                <span className="sr-only"> {plan.nombre}</span>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="px-4 h-10 rounded-xl font-bold text-xs sm:text-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
              >
                <Link to={`/app/planes/${plan.id}/editar`}>
                  Editar
                  <span className="sr-only"> {plan.nombre}</span>
                </Link>
              </Button>
            )}
          </Can>
        </div>
      )}
    </li>
  );
}

export function ListaPlanes({ planes, total, onActualizarPrecio, onEditarPlan, onVerHistorial }: { planes: Plan[]; total: number } & AccionesDeLaTarjeta) {
  return (
    <div className="space-y-4">
      <ul aria-label="Planes" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
        {planes.map((plan) => (
          <TarjetaPlan
            key={plan.id}
            plan={plan}
            onActualizarPrecio={onActualizarPrecio}
            onEditarPlan={onEditarPlan}
            onVerHistorial={onVerHistorial}
          />
        ))}
      </ul>
      {planes.length < total && (
        <p className="text-sm text-muted-foreground">
          Mostrando {planes.length} de {total} {total === 1 ? "plan" : "planes"}.
        </p>
      )}
    </div>
  );
}

/** Mientras cargan: la misma grilla, para que la pantalla no salte al llegar los datos. */
export function ListaPlanesCargando() {
  return (
    <div role="status">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
        {Array.from({ length: 6 }, (_, indice) => (
          <div key={indice} className="flex h-56 flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
            <div className="h-5 w-1/3 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-1/2 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 animate-pulse rounded-lg bg-muted/60" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando planes…</span>
    </div>
  );
}
