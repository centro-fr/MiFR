import { isAxiosError } from "axios";
import { AlertCircle, AlertTriangle, Calculator, Loader2, X } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import { esPeriodoEnCurso, etiquetaPeriodo } from "@/features/honorarios/utils/periodo";
import type { AdvertenciaHonorario, LiquidacionResumen } from "@/types/honorarios";

export function InformeCargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el informe" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((indice) => (
          <Skeleton key={indice} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// Un 404 de GET /liquidaciones es que el servidor todavía no tiene la ruta (el back de US-23 está en
// curso): su mensaje ("Ruta GET … no encontrada") es técnico y no le sirve a la propietaria.
function mensajeDeError(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 404) {
    return "El informe de honorarios todavía no está disponible en el servidor. Probá más tarde.";
  }
  return mensajeDeErrorApi(error, "No se pudo cargar el informe de honorarios.");
}

export function InformeConError({ error, reintentando, onReintentar }: { error: unknown; reintentando: boolean; onReintentar: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 px-5 py-12 text-center dark:border-slate-800">
      <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
      <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {mensajeDeError(error)}
      </p>
      <Button type="button" onClick={onReintentar} disabled={reintentando} className="min-h-11 rounded-xl bg-primary font-bold text-white hover:bg-primary-dark">
        Reintentar
      </Button>
    </Card>
  );
}

interface PropsSinCalcular {
  periodo: string;
  calculando: boolean;
  onCalcular: () => void;
}

/** El back solo tiene liquidaciones de un mes después de calcularlo (POST /liquidaciones). */
export function InformeSinCalcular({ periodo, calculando, onCalcular }: PropsSinCalcular) {
  return (
    <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-200 px-5 py-14 text-center dark:border-slate-800">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
        <Calculator aria-hidden="true" className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Todavía no se calcularon los honorarios de {etiquetaPeriodo(periodo)}</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        {esPeriodoEnCurso(periodo)
          ? "El mes está en curso: podés calcularlo ahora y volver a hacerlo hasta cerrar los honorarios de cada profesora."
          : "Se cuentan los alumnos que estuvieron inscriptos algún día del mes, asistan o no."}
      </p>
      <Can
        permission="HONORARIOS_LIQUIDAR"
        fallback={<p className="text-sm text-muted-foreground">Cuando se calculen, el informe va a aparecer acá.</p>}
      >
        <Button
          type="button"
          onClick={onCalcular}
          disabled={calculando}
          className="mt-2 min-h-11 rounded-xl bg-primary px-5 font-extrabold text-white shadow-lg shadow-primary/30 hover:bg-primary-dark"
        >
          {calculando && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {calculando ? "Calculando…" : "Calcular honorarios"}
        </Button>
      </Can>
    </Card>
  );
}

// TARIFA_NO_APLICABLE: la tarifa vigente es del tipo que el concepto ya no admite (por alumno, un
// porcentaje; por hora de suplencia, un monto fijo). Pasa con tarifas cargadas antes de esa regla.
const MOTIVO_DE_LA_ADVERTENCIA: Record<AdvertenciaHonorario["concepto"], Record<AdvertenciaHonorario["motivo"], string>> = {
  ALUMNO_A_CARGO: {
    SIN_TARIFA: "un alumno no sumó porque no tiene una tarifa por alumno vigente.",
    TARIFA_NO_APLICABLE: "un alumno no sumó, porque su tarifa por alumno es un monto fijo y tiene que ser un porcentaje de lo cobrado.",
  },
  HORA_SUPLENCIA: {
    SIN_TARIFA: "una clase que cubrió no sumó ni se descontó, porque no tiene una tarifa por hora de suplencia vigente.",
    TARIFA_NO_APLICABLE: "una clase que cubrió no sumó, porque su tarifa por hora de suplencia no es un monto fijo.",
  },
};

function textoDeAdvertencia(advertencia: AdvertenciaHonorario, profesoras: Map<number, string>): string {
  const profesora = profesoras.get(advertencia.idProfesora) ?? "Una profesora";
  return `${profesora}: ${MOTIVO_DE_LA_ADVERTENCIA[advertencia.concepto][advertencia.motivo]}`;
}

interface PropsAdvertencias {
  advertencias: AdvertenciaHonorario[];
  liquidaciones: LiquidacionResumen[];
  onCerrar: () => void;
}

/** Lo que el último cálculo no pudo liquidar: el back no lo guarda, solo lo informa al calcular. */
export function AvisoAdvertencias({ advertencias, liquidaciones, onCerrar }: PropsAdvertencias) {
  const profesoras = new Map(liquidaciones.map((fila) => [fila.profesora.id, nombreCompleto(fila.profesora)]));
  return (
    <section
      aria-label="Líneas sin calcular"
      className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-extrabold">Hay líneas que no se pudieron calcular</h2>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
          {advertencias.map((advertencia, indice) => (
            <li key={`${advertencia.idProfesora}-${advertencia.idInscripcion ?? advertencia.idClase ?? indice}`}>
              {textoDeAdvertencia(advertencia, profesoras)}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">Cargá la tarifa que falta y recalculá el mes.</p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onCerrar} aria-label="Cerrar el aviso" className="size-11 shrink-0 rounded-lg pointer-fine:size-9">
        <X aria-hidden="true" className="size-4" />
      </Button>
    </section>
  );
}
