import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { TablaSkeleton } from "@/components/ui/estados-pantalla";
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

interface AccionesDeLaTarjeta {
  onActualizarPrecio: (plan: Plan) => void;
  onEditarPlan?: (plan: Plan) => void;
  onVerHistorial?: (plan: Plan) => void;
  onReactivarPlan?: (plan: Plan) => void;
  reactivandoPlan?: boolean;
}

export function ListaPlanes({
  planes,
  total,
  cabecera,
  onActualizarPrecio,
  onEditarPlan,
  onVerHistorial,
  onReactivarPlan,
  reactivandoPlan,
}: {
  planes: Plan[];
  total: number;
  cabecera?: ReactNode;
} & AccionesDeLaTarjeta) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
        {cabecera}

        {/* Vista Desktop: Tabla limpia como en Alumnos - Listado */}
        <div className="hidden overflow-x-auto lg:block">
          <table aria-label="Planes" className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Plan
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Frecuencia
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Actividad
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Precio
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {planes.map((plan) => {
                const vigente = estaVigente(plan);
                return (
                  <tr
                    key={plan.id}
                    onClick={() => {
                      if (vigente) {
                        onEditarPlan?.(plan);
                      }
                    }}
                    className={cn(
                      "transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60",
                      vigente ? "cursor-pointer" : "opacity-60 bg-slate-50/40 dark:bg-slate-900/40",
                    )}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                          {plan.nombre}
                        </h2>
                        {plan.precioProgramado ? (
                          <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-bold px-2 py-0.5 shrink-0">
                            Sube el {fechaDiaMes(plan.precioProgramado.desde)}
                          </span>
                        ) : !vigente ? (
                          <BadgeEstadoPlan vigente={false} />
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {textoFrecuenciaCard(plan)}
                    </td>

                    <td className="px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {textoActividadCard(plan)}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-slate-900 dark:text-white">
                      <span className="font-bold tabular-nums">
                        {plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente)}
                      </span>{" "}
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {plan.tipo === "MENSUAL" ? "por mes" : "por clase"}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onVerHistorial && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onVerHistorial(plan);
                            }}
                            className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                          >
                            Historial
                          </Button>
                        )}
                        {!vigente && onReactivarPlan && (
                          <Can permission="PLANES_EDITAR">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={reactivandoPlan}
                              onClick={(e) => {
                                e.stopPropagation();
                                onReactivarPlan(plan);
                              }}
                              className="h-8 min-h-0 rounded-lg border-emerald-200 bg-emerald-50/70 px-3 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                            >
                              Reincorporar
                              <span className="sr-only"> {plan.nombre}</span>
                            </Button>
                          </Can>
                        )}
                        {vigente && (
                          <Can permission="PLANES_EDITAR">
                            {onEditarPlan ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditarPlan(plan);
                                }}
                                className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                              >
                                Editar
                                <span className="sr-only"> {plan.nombre}</span>
                              </Button>
                            ) : (
                              <Button
                                asChild
                                variant="outline"
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                              >
                                <Link to={`/app/planes/${plan.id}/editar`}>
                                  Editar
                                  <span className="sr-only"> {plan.nombre}</span>
                                </Link>
                              </Button>
                            )}
                          </Can>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Vista Mobile: Filas agrupadas como en Alumnos - Listado */}
        <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
          {planes.map((plan) => {
            const vigente = estaVigente(plan);
            const resumenPrecio =
              plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente);
            return (
              <div
                key={plan.id}
                onClick={() => {
                  if (vigente) {
                    onEditarPlan?.(plan);
                  }
                }}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60",
                  vigente ? "cursor-pointer" : "opacity-60 bg-slate-50/40 dark:bg-slate-900/40",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {plan.nombre}
                    </span>
                    {!vigente && <BadgeEstadoPlan vigente={false} />}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {plan.tipo === "MENSUAL" ? "Mensual" : "Clase suelta"} · {resumenPrecio}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onVerHistorial && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVerHistorial(plan);
                      }}
                      className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                    >
                      Historial
                    </Button>
                  )}
                  {!vigente && onReactivarPlan && (
                    <Can permission="PLANES_EDITAR">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={reactivandoPlan}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReactivarPlan(plan);
                        }}
                        className="h-8 min-h-0 rounded-lg border-emerald-200 bg-emerald-50/70 px-3 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                      >
                        Reincorporar
                        <span className="sr-only"> {plan.nombre}</span>
                      </Button>
                    </Can>
                  )}
                  {vigente && (
                    <Can permission="PLANES_EDITAR">
                      {onEditarPlan ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditarPlan(plan);
                          }}
                          className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                        >
                          Editar
                          <span className="sr-only"> {plan.nombre}</span>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          variant="outline"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                        >
                          <Link to={`/app/planes/${plan.id}/editar`}>
                            Editar
                            <span className="sr-only"> {plan.nombre}</span>
                          </Link>
                        </Button>
                      )}
                    </Can>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {planes.length < total && (
        <p className="text-sm text-muted-foreground">
          Mostrando {planes.length} de {total} {total === 1 ? "plan" : "planes"}.
        </p>
      )}
    </div>
  );
}

/** Mientras cargan: skeleton de filas de tabla como en Alumnos - Listado. */
export function ListaPlanesCargando() {
  return <TablaSkeleton ariaLabel="Cargando planes" cantidadPestanas={2} filas={5} />;
}
