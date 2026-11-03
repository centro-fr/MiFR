import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { CampoFechaDelFormulario } from "@/components/formulario/campo-fecha-del-formulario";
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
  describirTarifa,
  fechaCorta,
  inicioDeLaUltimaTarifa,
  nombreCompleto,
  tarifaVigente,
  tarifasDelAlcance,
} from "@/features/honorarios/utils/formato-honorarios";
import { esPeriodoEnCurso, etiquetaPeriodo, primerDiaDe, ultimoDiaDe } from "@/features/honorarios/utils/periodo";
import type { AlcanceTarifa, TarifaHonorario } from "@/types/honorarios";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";

const CONTROL =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-white/15 dark:bg-white/5 dark:text-white";
const ETIQUETA = "text-sm font-bold text-slate-800 dark:text-slate-200";

interface TextosDelAlcance {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  unidad: "%" | "$";
  placeholder: string;
  ayuda: string;
  ayudaDesde: string;
}

function textosDelAlcance(alcance: AlcanceTarifa): TextosDelAlcance {
  if (alcance.concepto === "ALUMNO_A_CARGO") {
    return {
      titulo: "Porcentaje por alumno a cargo",
      descripcion: "Es el mismo para todos los profesores.",
      etiqueta: "Por cada alumno a cargo",
      unidad: "%",
      placeholder: "50",
      ayuda: "De lo que pagó de la cuota en el mes. Mayor a 0 y hasta 100; podés usar coma para decimales.",
      ayudaDesde: "Reemplaza al porcentaje actual desde ese día, para todos los profesores. Los honorarios ya cerrados no cambian.",
    };
  }
  return {
    titulo: `Hora de suplencia de ${nombreCompleto(alcance.profesora)}`,
    descripcion: "Lo que cobra por cada hora de clase que cubre. Cada profesor/a tiene la suya.",
    etiqueta: "Por cada hora de suplencia",
    unidad: "$",
    placeholder: "5.000",
    ayuda: "Monto fijo por hora. A quien faltó se le descuenta lo mismo. Punto para miles y coma para decimales.",
    ayudaDesde: "Reemplaza a su monto actual desde ese día. Los honorarios ya cerrados no cambian.",
  };
}

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

function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
      {mensaje}
    </p>
  );
}

function TarifaQueRige({ alcance, tarifa, dia }: { alcance: AlcanceTarifa; tarifa: TarifaHonorario | undefined; dia: string }) {
  return (
    <section aria-label="Tarifa vigente" className="rounded-2xl border border-border bg-slate-50 p-4 dark:bg-white/5">
      <h3 className="text-xs font-extrabold tracking-wide text-slate-500 uppercase dark:text-slate-400">Rige al {fechaCorta(dia)}</h3>
      {tarifa ? (
        <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
          {describirTarifa(tarifa, alcance.concepto)} <span className="font-normal text-muted-foreground">desde {fechaCorta(tarifa.desde)}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
          {alcance.concepto === "ALUMNO_A_CARGO"
            ? "Sin cargar: los alumnos a cargo no suman nada."
            : "Sin cargar: las clases que cubra no suman ni se descuentan."}
        </p>
      )}
    </section>
  );
}

interface PropsFormulario {
  alcance: AlcanceTarifa;
  periodo: string;
  /** Las del mismo alcance. */
  tarifas: TarifaHonorario[];
  onListo: () => void;
}

function FormularioTarifa({ alcance, periodo, tarifas, onListo }: PropsFormulario) {
  const registrar = useRegistrarTarifa();
  const hoy = fechaActualArgentina();
  const ultimoInicio = useMemo(() => inicioDeLaUltimaTarifa(tarifas), [tarifas]);
  // Parte de la última cargada: casi siempre se ajusta un poco el valor que ya había.
  const ultima = ultimoInicio ? tarifaVigente(tarifas, ultimoInicio) : undefined;
  const formulario = useForm<TarifaFormValues>({
    resolver: zodResolver(crearTarifaFormSchema(alcance.concepto, ultimoInicio, hoy)),
    defaultValues: { valor: ultima ? valorComoTexto(ultima.valor) : "", desde: desdeSugerido(periodo, ultimoInicio, hoy) },
  });
  const errores = formulario.formState.errors;
  const textos = textosDelAlcance(alcance);
  const esPorcentaje = textos.unidad === "%";

  const guardar = formulario.handleSubmit(async (valores) => {
    try {
      await registrar.mutateAsync(aRegistrarTarifaBody(alcance, valores));
      toast.success(mensajeDeTarifaGuardada(periodo, valores.desde));
      onListo();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo guardar la tarifa."));
    }
  });

  return (
    <form onSubmit={(evento) => void guardar(evento)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tarifa-valor" className={ETIQUETA}>
          {textos.etiqueta} <span aria-hidden="true" className="text-rose-600">*</span>
        </label>
        <div className="relative">
          <span aria-hidden="true" className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 font-bold text-slate-500", esPorcentaje ? "right-3" : "left-3")}>
            {textos.unidad}
          </span>
          <input
            id="tarifa-valor"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            maxLength={14}
            placeholder={textos.placeholder}
            aria-invalid={Boolean(errores.valor)}
            aria-describedby={errores.valor ? "tarifa-valor-error" : "tarifa-valor-ayuda"}
            {...formulario.register("valor")}
            className={cn(CONTROL, esPorcentaje ? "pr-8" : "pl-8")}
          />
        </div>
        {errores.valor ? (
          <MensajeError id="tarifa-valor-error" mensaje={errores.valor.message} />
        ) : (
          <p id="tarifa-valor-ayuda" className="text-sm text-muted-foreground">
            {textos.ayuda}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tarifa-desde" className={ETIQUETA}>
          Rige desde <span aria-hidden="true" className="text-rose-600">*</span>
        </label>
        <CampoFechaDelFormulario
          control={formulario.control}
          name="desde"
          id="tarifa-desde"
          etiquetaCalendario="Abrir calendario para la fecha desde la que rige"
          min={hoy}
          aria-invalid={Boolean(errores.desde)}
          aria-describedby={errores.desde ? "tarifa-desde-error" : "tarifa-desde-ayuda"}
          className={cn(CONTROL, "md:text-base")}
        />
        {errores.desde ? (
          <MensajeError id="tarifa-desde-error" mensaje={errores.desde.message} />
        ) : (
          <p id="tarifa-desde-ayuda" className="text-sm text-muted-foreground">
            {textos.ayudaDesde}
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

function ContenidoDialogo({ alcance, periodo, onClose }: { alcance: AlcanceTarifa; periodo: string; onClose: () => void }) {
  const { data: todas, isPending, isError, error, refetch, isFetching } = useTarifas();
  const tarifas = useMemo(() => tarifasDelAlcance(todas ?? [], alcance), [todas, alcance]);
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
  const dia = ultimoDiaDe(periodo);
  return (
    <div className="flex flex-col gap-5">
      <TarifaQueRige alcance={alcance} tarifa={tarifaVigente(tarifas, dia)} dia={dia} />
      <FormularioTarifa alcance={alcance} periodo={periodo} tarifas={tarifas} onListo={onClose} />
    </div>
  );
}

interface PropsDialogo {
  abierto: boolean;
  /** El mes del informe: de ahí sale la tarifa que se muestra y desde cuándo se sugiere la nueva. */
  periodo: string;
  /** Qué tarifa se cambia. Se conserva al cerrar, para que el título no cambie mientras el diálogo se va. */
  alcance: AlcanceTarifa | null;
  onClose: () => void;
}

export function DialogoTarifa({ abierto, periodo, alcance, onClose }: PropsDialogo) {
  const textos = alcance ? textosDelAlcance(alcance) : null;
  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent bottomSheetOnMobile hideClose className="gap-0 border-border bg-white p-0 sm:max-w-lg dark:bg-surface-low">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 sm:px-6 text-left">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-extrabold tracking-wider text-primary uppercase">Honorarios</p>
            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">{textos?.titulo}</DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{textos?.descripcion}</DialogDescription>
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
          {abierto && alcance && <ContenidoDialogo alcance={alcance} periodo={periodo} onClose={onClose} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
