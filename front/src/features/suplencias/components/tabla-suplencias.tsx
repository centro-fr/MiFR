import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta, nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import type { Suplencia } from "@/types/suplencia";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";

interface Props {
  suplencias: Suplencia[];
  /** Lo que se le paga a quien cubrió cada una: null si no tiene valor por hora. */
  montos: Map<string, number | null>;
  /** Con el mes cerrado las suplencias ya son parte de los honorarios y no se tocan. */
  editables: boolean;
  onEditar: (suplencia: Suplencia) => void;
  onEliminar: (suplencia: Suplencia) => void;
}

const BOTON =
  "h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200";
const CABECERA = "px-4 py-3.5 font-bold text-slate-600 dark:text-slate-400";
const CELDA = "px-4 py-4 align-middle";

function horario({ horaInicio, horaFin }: Suplencia): string {
  return `${horaInicio} a ${horaFin}`;
}

function Monto({ suplencia, monto }: { suplencia: Suplencia; monto: number | null | undefined }) {
  if (suplencia.estadoClase === "CANCELADA") return <span className="text-muted-foreground">No se dictó</span>;
  if (monto === null || monto === undefined) return <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Sin valor por hora</span>;
  return <>{formatearPrecio(monto)}</>;
}

function Cancelada() {
  return (
    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Cancelada</span>
  );
}

function Acciones({
  suplencia,
  onEditar,
  onEliminar,
  enUnaLinea = false,
}: Pick<Props, "onEditar" | "onEliminar"> & { suplencia: Suplencia; enUnaLinea?: boolean }) {
  const fecha = fechaCorta(suplencia.fechaClase.slice(0, 10));
  return (
    <div className={cn("flex justify-end gap-2", enUnaLinea ? "flex-nowrap" : "flex-wrap")}>
      <Button type="button" variant="outline" aria-haspopup="dialog" onClick={() => onEditar(suplencia)} aria-label={`Editar la suplencia del ${fecha}`} className={BOTON}>
        Editar
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-haspopup="dialog"
        onClick={() => onEliminar(suplencia)}
        aria-label={`Eliminar la suplencia del ${fecha}`}
        className="h-8 min-h-0 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        Eliminar
      </Button>
    </div>
  );
}

/** Una fila por clase cubierta. En el celular y la tablet, una tarjeta por cada una. */
export function TablaSuplencias({ suplencias, montos, editables, onEditar, onEliminar }: Props) {
  const puedeEditar = (suplencia: Suplencia) => editables && suplencia.estadoClase !== "CANCELADA";
  return (
    <>
      <ul aria-label="Suplencias del mes" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
        {suplencias.map((suplencia) => (
          <li key={suplencia.idClase}>
            <Card className="flex flex-col gap-3 rounded-lg border-border bg-white p-4 shadow-sm dark:bg-surface-low">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-muted-foreground tabular-nums">
                    {fechaCorta(suplencia.fechaClase.slice(0, 10))} · {horario(suplencia)}
                  </p>
                  <p className="mt-0.5 break-words text-lg font-extrabold text-dark dark:text-white">{suplencia.actividad.nombre}</p>
                </div>
                {suplencia.estadoClase === "CANCELADA" && <Cancelada />}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Faltó</dt>
                <dd className="text-right">{nombreCompleto(suplencia.titular)}</dd>
                <dt className="text-muted-foreground">La cubrió</dt>
                <dd className="text-right font-bold">{nombreCompleto(suplencia.suplente)}</dd>
                <dt className="text-muted-foreground">Le paga</dt>
                <dd className="text-right font-bold tabular-nums">
                  <Monto suplencia={suplencia} monto={montos.get(suplencia.idClase)} />
                </dd>
              </dl>
              {suplencia.motivo && <p className="text-sm text-muted-foreground">{suplencia.motivo}</p>}
              {puedeEditar(suplencia) && <Acciones suplencia={suplencia} onEditar={onEditar} onEliminar={onEliminar} />}
            </Card>
          </li>
        ))}
      </ul>

      <Card className="hidden overflow-hidden rounded-lg border-slate-200/80 bg-white shadow-2xs xl:block dark:border-slate-800 dark:bg-slate-900">
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/60">
              <TableHead className={cn(CABECERA, "px-6")}>Fecha</TableHead>
              <TableHead className={CABECERA}>Clase</TableHead>
              <TableHead className={CABECERA}>Horario</TableHead>
              <TableHead className={CABECERA}>Faltó</TableHead>
              <TableHead className={CABECERA}>La cubrió</TableHead>
              <TableHead className={cn(CABECERA, "text-right")}>Le paga</TableHead>
              <TableHead className={cn(CABECERA, "w-px px-6 text-right whitespace-nowrap")}>
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suplencias.map((suplencia) => (
              <TableRow key={suplencia.idClase} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <TableCell className={cn(CELDA, "px-6 font-bold whitespace-nowrap tabular-nums text-dark dark:text-white")}>
                  {fechaCorta(suplencia.fechaClase.slice(0, 10))}
                </TableCell>
                <TableCell className={CELDA}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-dark dark:text-white">{suplencia.actividad.nombre}</span>
                    {suplencia.estadoClase === "CANCELADA" && <Cancelada />}
                  </div>
                  {suplencia.motivo && <p className="mt-0.5 text-xs text-muted-foreground">{suplencia.motivo}</p>}
                </TableCell>
                <TableCell className={cn(CELDA, "whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-300")}>{horario(suplencia)}</TableCell>
                <TableCell className={cn(CELDA, "text-slate-700 dark:text-slate-300")}>{nombreCompleto(suplencia.titular)}</TableCell>
                <TableCell className={cn(CELDA, "font-bold text-dark dark:text-white")}>{nombreCompleto(suplencia.suplente)}</TableCell>
                <TableCell className={cn(CELDA, "text-right font-black whitespace-nowrap tabular-nums text-dark dark:text-white")}>
                  <Monto suplencia={suplencia} monto={montos.get(suplencia.idClase)} />
                </TableCell>
                <TableCell className="px-6 py-3 align-middle">
                  {puedeEditar(suplencia) && <Acciones suplencia={suplencia} onEditar={onEditar} onEliminar={onEliminar} enUnaLinea />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
