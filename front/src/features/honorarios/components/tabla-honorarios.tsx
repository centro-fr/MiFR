import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
const CABECERA = "px-4 py-3.5 font-bold text-slate-600 dark:text-slate-400";
const NUMERO = "px-4 py-4 text-right align-middle tabular-nums whitespace-nowrap";

function Avatar({ liquidacion }: { liquidacion: LiquidacionResumen }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-extrabold text-violet-800 ring-1 ring-violet-200 ring-inset dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/30"
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

      <Card className="hidden overflow-hidden rounded-lg border-slate-200/80 bg-white shadow-2xs @4xl:block dark:border-slate-800 dark:bg-slate-900">
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/60">
              <TableHead className={cn(CABECERA, "px-6")}>Profesor/a</TableHead>
              <TableHead className={cn(CABECERA, "text-right")}>Alumnos</TableHead>
              <TableHead className={cn(CABECERA, "text-right")}>Por sus alumnos</TableHead>
              <TableHead className={cn(CABECERA, "text-right")}>Suplencias</TableHead>
              <TableHead className={cn(CABECERA, "text-right")}>Total</TableHead>
              <TableHead className={CABECERA}>Estado</TableHead>
              <TableHead className={cn(CABECERA, "px-6 text-right")}>
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liquidaciones.map((liquidacion) => {
              const { desglose } = liquidacion;
              return (
                <TableRow key={liquidacion.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <TableCell className="px-6 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <Avatar liquidacion={liquidacion} />
                      <span className="font-bold whitespace-nowrap text-dark dark:text-white">{nombreCompleto(liquidacion.profesora)}</span>
                    </div>
                  </TableCell>
                  <TableCell className={cn(NUMERO, "text-slate-700 dark:text-slate-300")}>{desglose ? desglose.cantidadAlumnos : "—"}</TableCell>
                  <TableCell className={cn(NUMERO, "text-slate-700 dark:text-slate-300")}>{desglose ? formatearPrecio(desglose.subtotalAlumnos) : "—"}</TableCell>
                  <TableCell className={cn(NUMERO, "font-semibold", desglose ? colorDelAjuste(desglose.subtotalSuplencias) : "text-muted-foreground")}>
                    {desglose ? formatearAjuste(desglose.subtotalSuplencias) : "—"}
                  </TableCell>
                  <TableCell className={cn(NUMERO, "font-black text-dark dark:text-white")}>{formatearPrecio(liquidacion.montoTotal)}</TableCell>
                  <TableCell className="px-4 py-4 align-middle">
                    <BadgeEstadoLiquidacion estado={liquidacion.estado} />
                  </TableCell>
                  <TableCell className="px-6 py-3 align-middle">
                    <Acciones liquidacion={liquidacion} onVerDetalle={onVerDetalle} onAbonar={onAbonar} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
