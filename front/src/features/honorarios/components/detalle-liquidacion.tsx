import { AlertCircle } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiquidacion } from "@/features/honorarios/hooks/use-honorarios";
import {
  baseCobrada,
  describirTarifa,
  fechaCorta,
  formatearAjuste,
  nombreCompleto,
  quienDeLaSuplencia,
} from "@/features/honorarios/utils/formato-honorarios";
import type { InscripcionDeLaLinea, LineaAlumno, LineaSuplencia } from "@/types/honorarios";
import { formatearPrecio } from "@/utils/moneda";

const FORMATO_PORCENTAJE = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

function calculoDeLaLinea(linea: LineaAlumno): string | null {
  if (!linea.tarifa) return null;
  const base = baseCobrada(linea.monto, linea.tarifa);
  if (base === null) return describirTarifa(linea.tarifa, "ALUMNO_A_CARGO");
  return `${formatearPrecio(base)} × ${FORMATO_PORCENTAJE.format(linea.tarifa.valor)}%`;
}

function SituacionDeLaInscripcion({ inscripcion }: { inscripcion: InscripcionDeLaLinea }) {
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      {inscripcion.plan} ·{" "}
      {inscripcion.estado === "BAJA" && inscripcion.fechaBaja ? (
        <span className="font-medium text-slate-700 dark:text-slate-200">Baja el {fechaCorta(inscripcion.fechaBaja)}</span>
      ) : (
        "Activa"
      )}
    </p>
  );
}

function ItemAlumno({ linea }: { linea: LineaAlumno }) {
  const calculo = calculoDeLaLinea(linea);
  return (
    <li className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-slate-900 dark:text-white">{nombreCompleto(linea.alumno)}</p>
        {linea.inscripcion && <SituacionDeLaInscripcion inscripcion={linea.inscripcion} />}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium text-slate-900 tabular-nums dark:text-white">{formatearPrecio(linea.monto)}</p>
        {calculo && <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">{calculo}</p>}
      </div>
    </li>
  );
}

function ItemSuplencia({ linea }: { linea: LineaSuplencia }) {
  const { clase } = linea;
  return (
    <li className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-slate-900 dark:text-white">{quienDeLaSuplencia(linea)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {clase.actividad} ·{" "}
          <span className="whitespace-nowrap">
            {fechaCorta(clase.fecha)} {clase.horaInicio}–{clase.horaFin}
          </span>
        </p>
      </div>
      <p className="shrink-0 text-sm font-medium text-slate-900 tabular-nums dark:text-white">
        {formatearAjuste(linea.monto)}
      </p>
    </li>
  );
}

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el detalle" className="space-y-3 py-2">
      {[0, 1, 2].map((indice) => (
        <Skeleton key={indice} className="h-9 w-full rounded-lg" />
      ))}
    </div>
  );
}

const TITULO = "text-sm font-bold text-slate-800 dark:text-slate-200";

/** Lo que se ve al abrir la tarjeta de una profesora: alumnos a cargo y suplencias del mes. */
export function DetalleLiquidacion({ id }: { id: number }) {
  const { data: detalle, isPending, isError, error, refetch, isFetching } = useLiquidacion(id, true);

  if (isPending) return <Cargando />;

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-2 py-2">
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {mensajeDeErrorApi(error, "No se pudo cargar el detalle.")}
        </p>
        <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()} className="min-h-11 rounded-lg text-sm font-bold pointer-fine:min-h-10">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section aria-label="Alumnos a cargo">
        <h3 className={TITULO}>Alumnos a cargo ({detalle.alumnos.length})</h3>
        {detalle.alumnos.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No tuvo alumnos a cargo en el mes: su honorario por alumnos es $ 0.</p>
        ) : (
          <ul className="divide-y divide-dashed divide-slate-200 dark:divide-slate-700">
            {detalle.alumnos.map((linea) => (
              <ItemAlumno key={linea.id} linea={linea} />
            ))}
          </ul>
        )}
      </section>
      {detalle.suplencias.length > 0 && (
        <section aria-label="Suplencias">
          <h3 className={TITULO}>Suplencias ({detalle.suplencias.length})</h3>
          <ul className="divide-y divide-dashed divide-slate-200 dark:divide-slate-700">
            {detalle.suplencias.map((linea) => (
              <ItemSuplencia key={linea.id} linea={linea} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
