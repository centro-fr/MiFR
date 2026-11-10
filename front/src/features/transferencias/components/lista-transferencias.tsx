import { memo } from "react";
import { inicialesDe } from "@/features/alumnos/utils/formato-ficha";
import { EtiquetaEstado, EtiquetaPlazo } from "@/features/transferencias/components/etiquetas-transferencia";
import { formatearDiaHoraCorto } from "@/features/transferencias/utils/formato-transferencia";
import { tramoDePlazo } from "@/features/transferencias/utils/plazo-verificacion";
import type { Transferencia } from "@/types/transferencia";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";

// Una sola grilla que muestra columnas cuando el contenedor tiene lugar y si no se apila como
// tarjeta, sin duplicar el DOM ni lo que lee el lector de pantalla. Es una container query: en
// escritorio la lista comparte el ancho con el panel de detalle, y el viewport no alcanza para decidir.
const GRILLA = "@2xl:grid @2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)] @2xl:items-center @2xl:gap-4";

export function AvatarAlumno({ nombre, apellido, className }: { nombre: string; apellido: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-primary-dark to-primary text-sm font-bold text-white",
        className,
      )}
    >
      {inicialesDe(nombre, apellido)}
    </span>
  );
}

// memo: al filtrar o seleccionar solo se vuelven a pintar las filas que cambian.
const FilaTransferencia = memo(function FilaTransferencia({ transferencia, seleccionada, onSeleccionar }: FilaProps) {
  const { alumno } = transferencia;
  const nombre = `${alumno.nombre} ${alumno.apellido}`;
  const vencida = transferencia.estado === "PENDIENTE" && tramoDePlazo(transferencia) === "vencida";
  return (
    <li>
      <button
        type="button"
        aria-pressed={seleccionada}
        aria-label={`Ver detalle de la transferencia de ${nombre}`}
        onClick={() => onSeleccionar(transferencia.id)}
        className={cn(
          "relative flex w-full flex-col gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5 dark:hover:bg-slate-800/60",
          GRILLA,
          vencida && "bg-rose-50/70 dark:bg-rose-500/10",
          seleccionada && "bg-pink-50 dark:bg-primary/15",
          // Franja lateral: marca la seleccionada (rosa) o la vencida (rojo).
          (seleccionada || vencida) && "before:absolute before:inset-y-0 before:left-0 before:w-1",
          seleccionada ? "before:bg-primary" : vencida && "before:bg-rose-600",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <AvatarAlumno nombre={alumno.nombre} apellido={alumno.apellido} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-bold text-slate-900 dark:text-white">{nombre}</span>
            {transferencia.titularCuenta && (
              <span className="truncate text-sm text-muted-foreground">Desde la cuenta de {transferencia.titularCuenta}</span>
            )}
          </span>
        </span>
        <span className="flex items-baseline justify-between gap-2 @2xl:block">
          <span className="text-sm text-muted-foreground @2xl:hidden">Monto</span>
          <span className="text-base font-extrabold tabular-nums text-slate-900 dark:text-white">{formatearPrecio(transferencia.monto)}</span>
        </span>
        <span className="flex items-baseline justify-between gap-2 text-sm @2xl:flex-col @2xl:items-start @2xl:gap-0.5">
          <span className="text-muted-foreground @2xl:hidden">Transferencia</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {transferencia.realizadaEl ? formatearDiaHoraCorto(transferencia.realizadaEl) : "Sin informar"}
          </span>
          <span className="hidden text-muted-foreground @2xl:inline">Cargada {formatearDiaHoraCorto(transferencia.cargadaEl)}</span>
        </span>
        <span className="flex @2xl:justify-end">
          {transferencia.estado === "PENDIENTE" ? (
            <EtiquetaPlazo transferencia={transferencia} />
          ) : (
            <EtiquetaEstado estado={transferencia.estado} />
          )}
        </span>
      </button>
    </li>
  );
});

interface FilaProps {
  transferencia: Transferencia;
  seleccionada: boolean;
  onSeleccionar: (id: number) => void;
}

interface Props {
  transferencias: Transferencia[];
  idSeleccionada: number | null;
  /** Encabezado de la columna de la derecha: el plazo para las pendientes, el estado para las resueltas. */
  columnaEstado: string;
  onSeleccionar: (id: number) => void;
}

export function ListaTransferencias({ transferencias, idSeleccionada, columnaEstado, onSeleccionar }: Props) {
  return (
    <div className="@container">
      <div
        aria-hidden="true"
        className={cn(
          "hidden border-b border-border bg-slate-100 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
          GRILLA,
        )}
      >
        <span>Alumno</span>
        <span>Monto</span>
        <span>Transferencia</span>
        <span className="text-right">{columnaEstado}</span>
      </div>
      <ul aria-label="Transferencias" className="divide-y divide-border dark:divide-slate-800/60">
        {transferencias.map((transferencia) => (
          <FilaTransferencia
            key={transferencia.id}
            transferencia={transferencia}
            seleccionada={transferencia.id === idSeleccionada}
            onSeleccionar={onSeleccionar}
          />
        ))}
      </ul>
    </div>
  );
}
