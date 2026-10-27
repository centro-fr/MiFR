import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegistrarTarifa, useTarifas } from "@/features/honorarios/hooks/use-honorarios";
import {
  aRegistrarTarifaBody,
  crearTarifaFormSchema,
  valorComoTexto,
  type TarifaFormValues,
} from "@/features/honorarios/schemas/tarifa-form";
import {
  ETIQUETA_CONCEPTO,
  describirTarifa,
  fechaCorta,
  inicioDeLaUltimaTarifa,
  tarifaVigente,
} from "@/features/honorarios/utils/formato-honorarios";
import { esPeriodoEnCurso, etiquetaPeriodo, primerDiaDe, ultimoDiaDe } from "@/features/honorarios/utils/periodo";
import type { ConceptoTarifa, TarifaHonorario } from "@/types/honorarios";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";

const CONTROL =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-white/15 dark:bg-white/5 dark:text-white";
const ETIQUETA = "text-sm font-bold text-slate-800 dark:text-slate-200";
const CONCEPTOS: ConceptoTarifa[] = ["ALUMNO_A_CARGO", "HORA_SUPLENCIA"];

function diaSiguiente(dia: string): string {
  return new Date(new Date(`${dia}T00:00:00.000Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
}

/**
 * El primer día del mes que se está viendo, pero nunca antes de hoy (el back no acepta vigencias en el
 * pasado) ni antes del día siguiente al inicio de la última tarifa.
 */
function desdeSugerido(periodo: string, ultimoInicio: string | null, hoy: string): string {
  const inicioDelMes = primerDiaDe(periodo);
  const desde = inicioDelMes > hoy ? inicioDelMes : hoy;
  return ultimoInicio && ultimoInicio >= desde ? diaSiguiente(ultimoInicio) : desde;
}

// Con la vigencia desde hoy, la tarifa solo puede cambiar el mes en curso.
function mensajeDeTarifaGuardada(periodo: string, desde: string): string {
  if (!esPeriodoEnCurso(periodo)) return `Tarifa guardada. Rige desde el ${fechaCorta(desde)}.`;
  return `Tarifa guardada. Si ${etiquetaPeriodo(periodo).toLowerCase()} sigue en revisión, recalculalo para aplicarla.`;
}

// Parte de la última tarifa cargada: casi siempre se cambia uno solo de los dos valores.
function valoresIniciales(tarifas: TarifaHonorario[], ultimoInicio: string | null, desde: string): TarifaFormValues {
  const ultima = (concepto: ConceptoTarifa) => (ultimoInicio ? tarifaVigente(tarifas, concepto, ultimoInicio) : undefined);
  const porAlumno = ultima("ALUMNO_A_CARGO");
  const porHora = ultima("HORA_SUPLENCIA");
  return {
    porcentaje: porAlumno ? valorComoTexto(porAlumno.valor) : "",
    montoPorHora: porHora ? valorComoTexto(porHora.valor) : "",
    desde,
  };
}

function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
      {mensaje}
    </p>
  );
}

function TarifasVigentes({ tarifas, dia }: { tarifas: TarifaHonorario[]; dia: string }) {
  const vigentes = CONCEPTOS.map((concepto) => ({ concepto, tarifa: tarifaVigente(tarifas, concepto, dia) }));
  return (
    <section aria-label="Tarifa vigente" className="rounded-2xl border border-border bg-slate-50 p-4 dark:bg-white/5">
      <h3 className="text-xs font-extrabold tracking-wide text-slate-500 uppercase dark:text-slate-400">Rige al {fechaCorta(dia)}</h3>
      {vigentes.every(({ tarifa }) => !tarifa) ? (
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Todavía no hay tarifa: los honorarios no suman nada.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {vigentes.map(({ concepto, tarifa }) => (
            <li key={concepto} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-slate-600 dark:text-slate-300">{ETIQUETA_CONCEPTO[concepto]}</span>
              {tarifa ? (
                <span className="font-bold text-slate-900 dark:text-white">
                  {describirTarifa(tarifa, concepto)} <span className="font-normal text-muted-foreground">desde {fechaCorta(tarifa.desde)}</span>
                </span>
              ) : (
                <span className="font-bold text-amber-800 dark:text-amber-200">Sin cargar</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface PropsCampoValor {
  id: string;
  etiqueta: string;
  unidad: "%" | "$";
  placeholder: string;
  ayuda: string;
  error?: string;
  registro: UseFormRegisterReturn;
}

function CampoValor({ id, etiqueta, unidad, placeholder, ayuda, error, registro }: PropsCampoValor) {
  const esPorcentaje = unidad === "%";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta} <span aria-hidden="true" className="text-rose-600">*</span>
      </label>
      <div className="relative">
        <span aria-hidden="true" className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 font-bold text-slate-500", esPorcentaje ? "right-3" : "left-3")}>
          {unidad}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          maxLength={14}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-ayuda`}
          {...registro}
          className={cn(CONTROL, esPorcentaje ? "pr-8" : "pl-8")}
        />
      </div>
      {error ? (
        <MensajeError id={`${id}-error`} mensaje={error} />
      ) : (
        <p id={`${id}-ayuda`} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
    </div>
  );
}

interface PropsFormulario {
  periodo: string;
  tarifas: TarifaHonorario[];
  onListo: () => void;
}

function FormularioTarifa({ periodo, tarifas, onListo }: PropsFormulario) {
  const registrar = useRegistrarTarifa();
  const hoy = fechaActualArgentina();
  const ultimoInicio = useMemo(() => inicioDeLaUltimaTarifa(tarifas), [tarifas]);
  const formulario = useForm<TarifaFormValues>({
    resolver: zodResolver(crearTarifaFormSchema(ultimoInicio, hoy)),
    defaultValues: valoresIniciales(tarifas, ultimoInicio, desdeSugerido(periodo, ultimoInicio, hoy)),
  });
  const errores = formulario.formState.errors;

  const guardar = formulario.handleSubmit(async (valores) => {
    try {
      await registrar.mutateAsync(aRegistrarTarifaBody(valores));
      toast.success(mensajeDeTarifaGuardada(periodo, valores.desde));
      onListo();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo guardar la tarifa."));
    }
  });

  return (
    <form onSubmit={(evento) => void guardar(evento)} noValidate className="flex flex-col gap-5">
      <fieldset aria-describedby="tarifa-conceptos-ayuda" className="flex flex-col gap-4">
        <legend className={ETIQUETA}>Qué cobra cada profesor/a</legend>
        <p id="tarifa-conceptos-ayuda" className="text-sm text-muted-foreground">
          Las dos cosas a la vez: se suman en sus honorarios del mes.
        </p>
        <CampoValor
          id="tarifa-porcentaje"
          etiqueta="Por cada alumno a cargo"
          unidad="%"
          placeholder="50"
          ayuda="De lo que pagó de la cuota en el mes. Mayor a 0 y hasta 100; podés usar coma para decimales."
          error={errores.porcentaje?.message}
          registro={formulario.register("porcentaje")}
        />
        <CampoValor
          id="tarifa-monto-hora"
          etiqueta="Por cada hora de suplencia"
          unidad="$"
          placeholder="5.000"
          ayuda="Monto fijo por hora de clase que cubre. Punto para miles y coma para decimales."
          error={errores.montoPorHora?.message}
          registro={formulario.register("montoPorHora")}
        />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tarifa-desde" className={ETIQUETA}>
          Rige desde <span aria-hidden="true" className="text-rose-600">*</span>
        </label>
        <input
          id="tarifa-desde"
          type="date"
          min={hoy}
          aria-invalid={Boolean(errores.desde)}
          aria-describedby={errores.desde ? "tarifa-desde-error" : "tarifa-desde-ayuda"}
          {...formulario.register("desde")}
          className={CONTROL}
        />
        {errores.desde ? (
          <MensajeError id="tarifa-desde-error" mensaje={errores.desde.message} />
        ) : (
          <p id="tarifa-desde-ayuda" className="text-sm text-muted-foreground">
            Reemplaza a la tarifa actual desde ese día, para todos los profesores. Los honorarios ya cerrados no cambian.
          </p>
        )}
      </div>

      {/* Fijos al pie del diálogo: en el celular el formulario no entra entero y Guardar queda siempre a mano.
          El -bottom compensa el relleno del contenedor que scrollea, para que no se vea el contenido por debajo. */}
      <div className="sticky -bottom-5 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-border bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6 sm:pb-6 dark:bg-surface-low">
        <Button type="button" variant="outline" onClick={onListo} disabled={registrar.isPending} className="min-h-11 rounded-xl font-bold">
          Cancelar
        </Button>
        <Button type="submit" disabled={registrar.isPending} className="min-h-11 rounded-xl bg-primary font-extrabold text-white hover:bg-primary-dark">
          {registrar.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {registrar.isPending ? "Guardando…" : "Guardar tarifa"}
        </Button>
      </div>
    </form>
  );
}

function ContenidoDialogo({ periodo, onClose }: { periodo: string; onClose: () => void }) {
  const { data: tarifas, isPending, isError, error, refetch, isFetching } = useTarifas();
  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Cargando la tarifa" className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {mensajeDeErrorApi(error, "No se pudo cargar la tarifa.")}
        </p>
        <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()} className="min-h-11 rounded-xl font-bold">
          Reintentar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <TarifasVigentes tarifas={tarifas} dia={ultimoDiaDe(periodo)} />
      <FormularioTarifa periodo={periodo} tarifas={tarifas} onListo={onClose} />
    </div>
  );
}

interface PropsDialogo {
  abierto: boolean;
  /** El mes del informe: de ahí sale la tarifa que se muestra y desde cuándo se sugiere la nueva. */
  periodo: string;
  onClose: () => void;
}

export function DialogoTarifa({ abierto, periodo, onClose }: PropsDialogo) {
  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent bottomSheetOnMobile hideClose className="gap-0 border-border bg-white p-0 sm:max-w-lg dark:bg-surface-low">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 sm:px-6 text-left">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-extrabold tracking-wider text-primary uppercase">Honorarios</p>
            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">Tarifa de honorarios</DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Es la misma para todos los profesores.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar diálogo de tarifa"
            className="size-11 shrink-0 rounded-full text-slate-500 pointer-fine:size-9 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {abierto && <ContenidoDialogo periodo={periodo} onClose={onClose} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
