import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BadgeEstadoLiquidacion } from "@/features/honorarios/components/badge-estado-liquidacion";
import { cantidadDeAlumnos, formatearAjuste, inicialesDe, nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import type { LiquidacionResumen } from "@/types/honorarios";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";

interface Props {
  liquidaciones: LiquidacionResumen[];
  onVerDetalle: (liquidacion: LiquidacionResumen) => void;
  onAbonar: (liquidacion: LiquidacionResumen) => void;
}

const BOTON =
  "h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200";
// Mismo formato que la tabla del listado de alumnos: encabezado chico en gris, filas separadas por una
// línea y el avatar rosa con iniciales.
const NUMERO = "px-4 py-3.5 tabular-nums whitespace-nowrap";

function Avatar({ liquidacion }: { liquidacion: LiquidacionResumen }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300"
    >
      {inicialesDe(liquidacion.profesora)}
    </span>
  );
}

function colorDelAjuste(monto: number): string {
  if (monto > 0) return "text-emerald-700 dark:text-emerald-300";
  if (monto < 0) return "text-rose-700 dark:text-rose-300";
  return "text-muted-foreground";
}

function Acciones({ liquidacion, onVerDetalle, onAbonar }: Omit<Props, "liquidaciones"> & { liquidacion: LiquidacionResumen }) {
  const nombre = nombreCompleto(liquidacion.profesora);
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {liquidacion.estado === "CERRADA" && (
        <Can permission="HONORARIOS_LIQUIDAR">
          <Button type="button" variant="outline" onClick={() => onAbonar(liquidacion)} aria-label={`Marcar como abonado a ${nombre}`} className={BOTON}>
            Marcar abonado
          </Button>
        </Can>
      )}
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        onClick={() => onVerDetalle(liquidacion)}
        aria-label={`Ver el detalle de ${nombre}`}
        className={BOTON}
      >
        Ver detalle
      </Button>
    </div>
  );
}

/**
 * Una fila por profesor/a. Si no entra la tabla, una tarjeta por cada una. Se decide por el ancho del
 * contenido y no de la pantalla: con el menú lateral abierto, una tablet deja el lugar de un celular.
 */
export function TablaHonorarios({ liquidaciones, onVerDetalle, onAbonar }: Props) {
  return (
    <div className="@container">
      <ul aria-label="Honorarios por profesor/a" className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @4xl:hidden">
        {liquidaciones.map((liquidacion) => (
          <li key={liquidacion.id}>
            <Card className="flex flex-col gap-3 rounded-lg border-border bg-white p-4 shadow-sm dark:bg-surface-low">
              <div className="flex items-center gap-3">
                <Avatar liquidacion={liquidacion} />
                <p className="min-w-0 flex-1 break-words font-extrabold text-dark dark:text-white">{nombreCompleto(liquidacion.profesora)}</p>
                <BadgeEstadoLiquidacion estado={liquidacion.estado} />
              </div>
              <p className="text-2xl font-black tracking-tight text-dark tabular-nums dark:text-white">{formatearPrecio(liquidacion.montoTotal)}</p>
              {liquidacion.desglose && (
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Por {cantidadDeAlumnos(liquidacion.desglose.cantidadAlumnos)}</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatearPrecio(liquidacion.desglose.subtotalAlumnos)}</dd>
                  <dt className="text-muted-foreground">Suplencias</dt>
                  <dd className={cn("text-right font-semibold tabular-nums", colorDelAjuste(liquidacion.desglose.subtotalSuplencias))}>
                    {formatearAjuste(liquidacion.desglose.subtotalSuplencias)}
                  </dd>
                </dl>
              )}
              <Acciones liquidacion={liquidacion} onVerDetalle={onVerDetalle} onAbonar={onAbonar} />
            </Card>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs @4xl:block dark:border-slate-700/80 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3.5">Profesor/a</th>
              <th scope="col" className="px-4 py-3.5">Alumnos</th>
              <th scope="col" className="px-4 py-3.5">Por sus alumnos</th>
              <th scope="col" className="px-4 py-3.5">Suplencias</th>
              <th scope="col" className="px-4 py-3.5">Total</th>
              <th scope="col" className="px-4 py-3.5">Estado</th>
              <th scope="col" className="px-6 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {liquidaciones.map((liquidacion) => {
              const { desglose } = liquidacion;
              return (
                <tr key={liquidacion.id} className="transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar liquidacion={liquidacion} />
                      <span className="text-sm font-bold whitespace-nowrap text-slate-900 dark:text-white">{nombreCompleto(liquidacion.profesora)}</span>
                    </div>
                  </td>
                  <td className={cn(NUMERO, "font-medium text-slate-600 dark:text-slate-300")}>{desglose ? desglose.cantidadAlumnos : "—"}</td>
                  <td className={cn(NUMERO, "font-medium text-slate-700 dark:text-slate-200")}>{desglose ? formatearPrecio(desglose.subtotalAlumnos) : "—"}</td>
                  <td className={cn(NUMERO, "font-medium", desglose ? colorDelAjuste(desglose.subtotalSuplencias) : "text-muted-foreground")}>
                    {desglose ? formatearAjuste(desglose.subtotalSuplencias) : "—"}
                  </td>
                  <td className={cn(NUMERO, "font-bold text-slate-900 dark:text-white")}>{formatearPrecio(liquidacion.montoTotal)}</td>
                  <td className="px-4 py-3.5">
                    <BadgeEstadoLiquidacion estado={liquidacion.estado} />
                  </td>
                  <td className="px-6 py-3.5">
                    <Acciones liquidacion={liquidacion} onVerDetalle={onVerDetalle} onAbonar={onAbonar} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
