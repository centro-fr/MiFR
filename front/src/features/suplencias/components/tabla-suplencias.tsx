import { BOTON_FILA, BOTON_FILA_PELIGRO, LISTA_MOVIL } from "@/components/ui/estilos-lista";
import { FilaMovil } from "@/components/ui/fila-movil";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta, nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import { mesSigueAbierto } from "@/features/honorarios/utils/periodo";
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
      <Button type="button" variant="outline" aria-haspopup="dialog" onClick={() => onEditar(suplencia)} aria-label={`Editar la suplencia del ${fecha}`} className={BOTON_FILA}>
        Editar
      </Button>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        onClick={() => onEliminar(suplencia)}
        aria-label={`Eliminar la suplencia del ${fecha}`}
        className={BOTON_FILA_PELIGRO}
      >
        Eliminar
      </Button>
    </div>
  );
}

/** Una fila por clase cubierta. En el celular y la tablet, una tarjeta por cada una. */
export function TablaSuplencias({ suplencias, montos, editables, onEditar, onEliminar }: Props) {
  const puedeEditar = (suplencia: Suplencia) =>
    (editables && mesSigueAbierto(suplencia.fechaClase.slice(0, 7))) && suplencia.estadoClase !== "CANCELADA";
  return (
    <>
      <ul aria-label="Suplencias del mes" className={cn(LISTA_MOVIL, "xl:hidden")}>
        {suplencias.map((suplencia) => (
          <FilaMovil
            key={suplencia.idClase}
            titulo={suplencia.actividad.nombre}
            insignia={suplencia.estadoClase === "CANCELADA" ? <Cancelada /> : undefined}
            detalle={[
              `${fechaCorta(suplencia.fechaClase.slice(0, 10))} · ${horario(suplencia)}`,
              `Faltó ${nombreCompleto(suplencia.titular)}`,
              `La cubrió ${nombreCompleto(suplencia.suplente)}`,
              <Monto key="monto" suplencia={suplencia} monto={montos.get(suplencia.idClase)} />,
              suplencia.motivo,
            ]}
            acciones={puedeEditar(suplencia) ? <Acciones suplencia={suplencia} onEditar={onEditar} onEliminar={onEliminar} /> : undefined}
          />
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
