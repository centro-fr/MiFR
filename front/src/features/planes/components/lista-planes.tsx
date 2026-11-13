import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { TablaSkeleton } from "@/components/ui/estados-pantalla";
import { PaginacionTabla } from "@/components/ui/paginacion-tabla";
import { FilaMovil } from "@/components/ui/fila-movil";
import { BOTON_FILA, BOTON_FILA_PELIGRO, BOTON_FILA_REINCORPORAR, LISTA_MOVIL_EN_TARJETA } from "@/components/ui/estilos-lista";
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
  onDarDeBajaPlan?: (plan: Plan) => void;
  onReactivarPlan?: (plan: Plan) => void;
  reactivandoPlan?: boolean;
}

type AccionesDelPlan = Pick<AccionesDeLaTarjeta, "onEditarPlan" | "onVerHistorial" | "onDarDeBajaPlan" | "onReactivarPlan" | "reactivandoPlan">;

/** Las acciones de un plan: las mismas en la tabla y en la lista del celular. */
function AccionesPlan({ plan, onEditarPlan, onVerHistorial, onDarDeBajaPlan, onReactivarPlan, reactivandoPlan }: AccionesDelPlan & { plan: Plan }) {
  const vigente = estaVigente(plan);
  return (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {onVerHistorial && (
        <Button type="button" variant="outline" onClick={() => onVerHistorial(plan)} className={BOTON_FILA}>
          Historial
        </Button>
      )}
      {!vigente && onReactivarPlan && (
        <Can permission="PLANES_EDITAR">
          <Button
            type="button"
            variant="outline"
            disabled={reactivandoPlan}
            onClick={() => onReactivarPlan(plan)}
            className={BOTON_FILA_REINCORPORAR}
          >
            Reincorporar
            <span className="sr-only"> {plan.nombre}</span>
          </Button>
        </Can>
      )}
      {vigente && (
        <Can permission="PLANES_EDITAR">
          {onEditarPlan ? (
            <Button type="button" variant="outline" onClick={() => onEditarPlan(plan)} className={BOTON_FILA}>
              Editar
              <span className="sr-only"> {plan.nombre}</span>
            </Button>
          ) : (
            <Button asChild variant="outline" className={BOTON_FILA}>
              <Link to={`/app/planes/${plan.id}/editar`}>
                Editar
                <span className="sr-only"> {plan.nombre}</span>
              </Link>
            </Button>
          )}
          {onDarDeBajaPlan && (
            <Button type="button" variant="outline" onClick={() => onDarDeBajaPlan(plan)} className={BOTON_FILA_PELIGRO}>
              Dar de baja
              <span className="sr-only"> {plan.nombre}</span>
            </Button>
          )}
        </Can>
      )}
    </div>
  );
}

/** El aviso de un aumento programado o, si el plan está de baja, su estado. */
function InsigniaPlan({ plan }: { plan: Plan }) {
  if (plan.precioProgramado) {
    return (
      <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs font-bold px-2 py-0.5 shrink-0">
        Sube el {fechaDiaMes(plan.precioProgramado.desde)}
      </span>
    );
  }
  return estaVigente(plan) ? null : <BadgeEstadoPlan vigente={false} />;
}

function textoPrecio(plan: Plan): string {
  const precio = plan.precioVigente === null ? "Sin precio" : formatearPrecio(plan.precioVigente);
  return `${precio} ${plan.tipo === "MENSUAL" ? "por mes" : "por clase"}`;
}

export function ListaPlanes({
  planes,
  total: _total,
  cabecera,
  onEditarPlan,
  onVerHistorial,
  onDarDeBajaPlan,
  onReactivarPlan,
  reactivandoPlan,
}: {
  planes: Plan[];
  total: number;
  cabecera?: ReactNode;
} & AccionesDeLaTarjeta) {
  const TAMANO_PAGINA = 10;
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    setPagina(0);
  }, [planes]);

  const planesPaginados = useMemo(() => {
    const inicio = pagina * TAMANO_PAGINA;
    return planes.slice(inicio, inicio + TAMANO_PAGINA);
  }, [planes, pagina]);

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
              {planesPaginados.map((plan) => {
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
                        <InsigniaPlan plan={plan} />
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
                      <AccionesPlan
                        plan={plan}
                        onEditarPlan={onEditarPlan}
                        onVerHistorial={onVerHistorial}
                        onDarDeBajaPlan={onDarDeBajaPlan}
                        onReactivarPlan={onReactivarPlan}
                        reactivandoPlan={reactivandoPlan}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Vista Mobile: Filas agrupadas como en Alumnos - Listado */}
        <ul aria-label="Planes" className={cn(LISTA_MOVIL_EN_TARJETA, "lg:hidden")}>
          {planesPaginados.map((plan) => {
            const vigente = estaVigente(plan);
            return (
              <FilaMovil
                key={plan.id}
                titulo={plan.nombre}
                insignia={<InsigniaPlan plan={plan} />}
                detalle={[textoFrecuenciaCard(plan), textoActividadCard(plan), textoPrecio(plan)]}
                atenuada={!vigente}
                onAbrir={vigente && onEditarPlan ? () => onEditarPlan(plan) : undefined}
                acciones={
                  <AccionesPlan
                    plan={plan}
                    onEditarPlan={onEditarPlan}
                    onVerHistorial={onVerHistorial}
                    onDarDeBajaPlan={onDarDeBajaPlan}
                    onReactivarPlan={onReactivarPlan}
                    reactivandoPlan={reactivandoPlan}
                  />
                }
              />
            );
          })}
        </ul>

        {planes.length > TAMANO_PAGINA && (
          <div className="border-t border-slate-100 p-3 dark:border-slate-800">
            <PaginacionTabla
              pagina={pagina}
              total={planes.length}
              tamanoPagina={TAMANO_PAGINA}
              onCambiarPagina={setPagina}
              etiquetaItems="planes"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Mientras cargan: skeleton de filas de tabla como en Alumnos - Listado. */
export function ListaPlanesCargando() {
  return <TablaSkeleton ariaLabel="Cargando planes" cantidadPestanas={2} filas={5} />;
}
