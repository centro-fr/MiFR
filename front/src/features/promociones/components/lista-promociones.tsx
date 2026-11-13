import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TablaSkeleton } from "@/components/ui/estados-pantalla";
import { PaginacionTabla } from "@/components/ui/paginacion-tabla";
import { FilaMovil } from "@/components/ui/fila-movil";
import { BOTON_FILA, BOTON_FILA_PELIGRO, LISTA_MOVIL_EN_TARJETA } from "@/components/ui/estilos-lista";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import type { Promocion } from "@/types/promocion";
import { cn } from "@/utils/cn";

const ESTADOS: Record<Promocion["estado"], { badge: string; dot: string; label: string }> = {
  ACTIVA: {
    badge: "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Activa",
  },
  PROGRAMADA: {
    badge: "border-blue-200/60 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Programada",
  },
  VENCIDA: {
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
    label: "Vencida",
  },
  DESACTIVADA: {
    badge: "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300",
    dot: "bg-rose-500",
    label: "Desactivada",
  },
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

function BadgeEstadoPromocion({ estado }: { estado: Promocion["estado"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
        ESTADOS[estado].badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", ESTADOS[estado].dot)} aria-hidden="true" />
      {ESTADOS[estado].label}
    </span>
  );
}

// "Todos" cuando aplica a todos los planes (o no se eligió ninguno).
function nombresDePlanes(promocion: Promocion, totalPlanes: number | undefined): string {
  const aTodos =
    promocion.planes.length === 0 || (totalPlanes !== undefined && totalPlanes > 0 && promocion.planes.length >= totalPlanes);
  return aTodos ? "Todos" : promocion.planes.map((plan) => plan.nombre).join(", ") || "—";
}

function esEditable(promocion: Promocion): boolean {
  return promocion.activo && promocion.estado !== "VENCIDA";
}

interface AccionesPromocionProps {
  promocion: Promocion;
  onEditar: (promocion: Promocion) => void;
  onDesactivar: (promocion: Promocion) => void;
}

/** Editar y Eliminar: los mismos en la tabla y en la lista del celular. */
function AccionesPromocion({ promocion, onEditar, onDesactivar }: AccionesPromocionProps) {
  return (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {esEditable(promocion) && (
        <Button type="button" variant="outline" onClick={() => onEditar(promocion)} className={BOTON_FILA}>
          Editar
        </Button>
      )}
      <Button type="button" variant="outline" onClick={() => onDesactivar(promocion)} className={BOTON_FILA_PELIGRO}>
        Eliminar
      </Button>
    </div>
  );
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
  const TAMANO_PAGINA = 10;
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    setPagina(0);
  }, [promociones]);

  const promocionesPaginadas = useMemo(() => {
    const inicio = pagina * TAMANO_PAGINA;
    return promociones.slice(inicio, inicio + TAMANO_PAGINA);
  }, [promociones, pagina]);

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
            {promocionesPaginadas.map((promocion) => {
              const editable = esEditable(promocion);
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

                  <td className="px-4 py-3.5 font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                    {descuento(promocion)}
                  </td>

                  <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {nombresDePlanes(promocion, totalPlanes)}
                  </td>

                  <td className="px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                    {formatearVigencia(promocion.fechaDesde, promocion.fechaHasta)}
                  </td>

                  <td className="px-4 py-3.5">
                    <BadgeEstadoPromocion estado={promocion.estado} />
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <AccionesPromocion promocion={promocion} onEditar={onEditar} onDesactivar={onDesactivar} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile: Filas agrupadas como en Alumnos - Listado */}
      <ul aria-label="Promociones" className={cn(LISTA_MOVIL_EN_TARJETA, "lg:hidden")}>
        {promocionesPaginadas.map((promocion) => (
          <FilaMovil
            key={promocion.id}
            titulo={promocion.nombre}
            insignia={<BadgeEstadoPromocion estado={promocion.estado} />}
            detalle={[
              descuento(promocion),
              nombresDePlanes(promocion, totalPlanes),
              formatearVigencia(promocion.fechaDesde, promocion.fechaHasta),
            ]}
            onAbrir={esEditable(promocion) ? () => onEditar(promocion) : undefined}
            acciones={<AccionesPromocion promocion={promocion} onEditar={onEditar} onDesactivar={onDesactivar} />}
          />
        ))}
      </ul>

      {promociones.length > TAMANO_PAGINA && (
        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <PaginacionTabla
            pagina={pagina}
            total={promociones.length}
            tamanoPagina={TAMANO_PAGINA}
            onCambiarPagina={setPagina}
            etiquetaItems="promociones"
          />
        </div>
      )}
    </div>
  );
}

/** Mientras cargan: skeleton de filas de tabla como en Alumnos - Listado. */
export function ListaPromocionesCargando() {
  return <TablaSkeleton ariaLabel="Cargando promociones" filas={5} />;
}
