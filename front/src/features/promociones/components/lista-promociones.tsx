import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TablaSkeleton } from "@/components/ui/estados-pantalla";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import type { Promocion } from "@/types/promocion";
import { cn } from "@/utils/cn";

const ESTADOS: Record<Promocion["estado"], string> = {
  ACTIVA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  PROGRAMADA: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  VENCIDA: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  DESACTIVADA: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

function descuento(promocion: Promocion): string {
  return promocion.tipoDescuento === "PORCENTAJE"
    ? `${promocion.valor}% OFF`
    : `$${promocion.valor.toLocaleString("es-AR")} OFF`;
}

function formatearVigencia(desde: string, hasta: string): string {
  if (hasta.startsWith("2099") || hasta >= "2099-01-01") {
    return "Permanente";
  }
  const d = formatearFecha(desde) || desde.slice(0, 10).replace(/-/g, "/");
  const h = formatearFecha(hasta) || hasta.slice(0, 10).replace(/-/g, "/");
  return `${d} al ${h}`;
}

export function ListaPromociones({
  promociones,
  cabecera,
  totalPlanes,
  onEditar,
  onDesactivar,
}: {
  promociones: Promocion[];
  cabecera?: ReactNode;
  totalPlanes?: number;
  onEditar: (promocion: Promocion) => void;
  onDesactivar: (promocion: Promocion) => void;
  onReactivar?: (promocion: Promocion) => void;
  reactivandoId?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
      {cabecera}

      {/* Vista Desktop: Tabla limpia como en Alumnos - Listado */}
      <div className="hidden overflow-x-auto lg:block">
        <table aria-label="Promociones" className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Promoción
              </th>
              <th scope="col" className="px-4 py-3.5">
                Código
              </th>
              <th scope="col" className="px-4 py-3.5">
                Descuento
              </th>
              <th scope="col" className="px-4 py-3.5">
                Planes
              </th>
              <th scope="col" className="px-4 py-3.5">
                Vigencia
              </th>
              <th scope="col" className="px-4 py-3.5">
                Estado
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {promociones.map((promocion) => {
              const editable = promocion.activo && promocion.estado !== "VENCIDA";
              const esTodosLosPlanes =
                (totalPlanes !== undefined && totalPlanes > 0 && promocion.planes.length >= totalPlanes) ||
                promocion.planes.length === 0;
              const nombresPlanes = esTodosLosPlanes
                ? "Todos"
                : promocion.planes.map((plan) => plan.nombre).join(", ") || "—";
              const vigencia = formatearVigencia(promocion.fechaDesde, promocion.fechaHasta);

              return (
                <tr
                  key={promocion.id}
                  onClick={() => {
                    if (editable) onEditar(promocion);
                  }}
                  className={cn(
                    "transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60",
                    editable && "cursor-pointer",
                  )}
                >
                  <td className="px-6 py-3.5">
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                      {promocion.nombre}
                    </h2>
                  </td>

                  <td className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {promocion.codigo}
                  </td>

                  <td className="px-4 py-3.5 font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                    {descuento(promocion)}
                  </td>

                  <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {nombresPlanes}
                  </td>

                  <td className="px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                    {vigencia}
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize",
                        ESTADOS[promocion.estado],
                      )}
                    >
                      {promocion.estado.toLowerCase()}
                    </span>
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editable && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditar(promocion);
                          }}
                          className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDesactivar(promocion);
                        }}
                        className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-rose-600 dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile: Cards apiladas */}
      <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800/60">
        {promociones.map((promocion) => {
          const editable = promocion.activo && promocion.estado !== "VENCIDA";
          const esTodosLosPlanes =
            (totalPlanes !== undefined && totalPlanes > 0 && promocion.planes.length >= totalPlanes) ||
            promocion.planes.length === 0;
          const nombresPlanes = esTodosLosPlanes
            ? "Todos"
            : promocion.planes.map((plan) => plan.nombre).join(", ") || "—";
          const vigencia = formatearVigencia(promocion.fechaDesde, promocion.fechaHasta);

          return (
            <div
              key={promocion.id}
              onClick={() => {
                if (editable) onEditar(promocion);
              }}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60",
                editable && "cursor-pointer",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {promocion.nombre}
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize",
                      ESTADOS[promocion.estado],
                    )}
                  >
                    {promocion.estado.toLowerCase()}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{promocion.codigo}</span> · {descuento(promocion)} · {nombresPlanes}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {vigencia}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {editable && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditar(promocion);
                    }}
                    className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                  >
                    Editar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDesactivar(promocion);
                  }}
                  className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-rose-600 dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Mientras cargan: skeleton de filas de tabla como en Alumnos - Listado. */
export function ListaPromocionesCargando() {
  return <TablaSkeleton ariaLabel="Cargando promociones" filas={5} />;
}
