import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
  type TarifaFormValues,
  type UltimoInicioPorConcepto,
} from "@/features/honorarios/schemas/tarifa-form";
import {
  ETIQUETA_CONCEPTO,
  describirTarifa,
  fechaCorta,
  nombreCompleto,
  ultimaTarifaGeneral,
} from "@/features/honorarios/utils/formato-honorarios";
import { etiquetaPeriodo, primerDiaDe, ultimoDiaDe } from "@/features/honorarios/utils/periodo";
import type { LiquidacionResumen, ProfesoraDeLiquidacion, TarifaHonorario } from "@/types/honorarios";
import { cn } from "@/utils/cn";

const CONTROL =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-white/15 dark:bg-white/5 dark:text-white";
const ETIQUETA = "text-sm font-bold text-slate-800 dark:text-slate-200";
const OPCION =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 text-sm font-semibold text-slate-800 has-checked:border-primary has-checked:bg-pink-50 dark:text-slate-100 dark:has-checked:bg-primary/15";

function diaSiguiente(dia: string): string {
  return new Date(new Date(`${dia}T00:00:00.000Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
}

/** El primer día del mes que se está viendo, salvo que ya haya una tarifa que empiece ese día o después. */
function desdeSugerido(periodo: string, ultimoInicio: string | null): string {
  const inicioDelMes = primerDiaDe(periodo);
  return ultimoInicio && ultimoInicio >= inicioDelMes ? diaSiguiente(ultimoInicio) : inicioDelMes;
}

function etiquetaDelValor(concepto: TarifaFormValues["concepto"], tipoValor: TarifaFormValues["tipoValor"]): string {
  if (tipoValor === "PORCENTAJE") return "Porcentaje";
  return concepto === "HORA_SUPLENCIA" ? "Monto por hora (ARS)" : "Monto por alumno (ARS)";
}

function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
      {mensaje}
    </p>
  );
}

function TarifasVigentes({ tarifas, idProfesora, dia }: { tarifas: TarifaHonorario[]; idProfesora: number; dia: string }) {
  const vigentes = tarifas.filter(
    (tarifa) => tarifa.idProfesora === idProfesora && tarifa.desde <= dia && (tarifa.hasta === null || tarifa.hasta >= dia),
  );
  return (
    <section aria-label="Tarifas vigentes" className="rounded-2xl border border-border bg-slate-50 p-4 dark:bg-white/5">
      <h3 className="text-xs font-extrabold tracking-wide text-slate-500 uppercase dark:text-slate-400">Rigen al {fechaCorta(dia)}</h3>
      {vigentes.length === 0 ? (
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Todavía no tiene tarifas: sus alumnos no suman honorarios.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {vigentes.map((tarifa) => (
            <li key={tarifa.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {ETIQUETA_CONCEPTO[tarifa.concepto]}
                {tarifa.plan && ` · ${tarifa.plan.nombre}`}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {describirTarifa(tarifa, tarifa.concepto)} <span className="font-normal text-muted-foreground">desde {fechaCorta(tarifa.desde)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface PropsFormulario {
  profesora: ProfesoraDeLiquidacion;
  periodo: string;
  tarifas: TarifaHonorario[];
  onListo: () => void;
}

function FormularioTarifa({ profesora, periodo, tarifas, onListo }: PropsFormulario) {
  const registrar = useRegistrarTarifa();
  const ultimoInicio = useMemo<UltimoInicioPorConcepto>(
    () => ({
      ALUMNO_A_CARGO: ultimaTarifaGeneral(tarifas, profesora.id, "ALUMNO_A_CARGO")?.desde ?? null,
      HORA_SUPLENCIA: ultimaTarifaGeneral(tarifas, profesora.id, "HORA_SUPLENCIA")?.desde ?? null,
    }),
    [tarifas, profesora.id],
  );
  const formulario = useForm<TarifaFormValues>({
    resolver: zodResolver(crearTarifaFormSchema(ultimoInicio)),
    defaultValues: {
      concepto: "ALUMNO_A_CARGO",
      tipoValor: "PORCENTAJE",
      valor: "",
      desde: desdeSugerido(periodo, ultimoInicio.ALUMNO_A_CARGO),
    },
  });
  const errores = formulario.formState.errors;
  const [concepto, tipoValor] = useWatch({ control: formulario.control, name: ["concepto", "tipoValor"] });
  const esPorcentaje = tipoValor === "PORCENTAJE";

  const guardar = formulario.handleSubmit(async (valores) => {
    try {
      await registrar.mutateAsync(aRegistrarTarifaBody(profesora.id, valores));
      toast.success(`Tarifa guardada. Si ${etiquetaPeriodo(periodo).toLowerCase()} sigue en revisión, recalculalo para aplicarla.`);
      onListo();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo guardar la tarifa."));
    }
  });

  const registroConcepto = formulario.register("concepto", {
    // La hora de suplencia solo admite monto fijo, y la última tarifa de cada concepto empieza en otra fecha.
    onChange: (evento: { target: { value: TarifaFormValues["concepto"] } }) => {
      const elegido = evento.target.value;
      if (elegido === "HORA_SUPLENCIA") formulario.setValue("tipoValor", "MONTO_FIJO");
      formulario.setValue("desde", desdeSugerido(periodo, ultimoInicio[elegido]));
    },
  });

  return (
    <form onSubmit={(evento) => void guardar(evento)} noValidate className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(ETIQUETA, "mb-2")}>Qué se le paga</legend>
        {(["ALUMNO_A_CARGO", "HORA_SUPLENCIA"] as const).map((opcion) => (
          <label key={opcion} className={OPCION}>
            <input type="radio" value={opcion} {...registroConcepto} className="size-4 accent-primary" />
            {ETIQUETA_CONCEPTO[opcion]}
          </label>
        ))}
      </fieldset>

      {concepto === "ALUMNO_A_CARGO" && (
        <fieldset className="flex flex-col gap-2">
          <legend className={cn(ETIQUETA, "mb-2")}>Cómo se calcula</legend>
          <label className={OPCION}>
            <input type="radio" value="PORCENTAJE" {...formulario.register("tipoValor")} className="size-4 accent-primary" />
            Porcentaje de lo cobrado de la cuota
          </label>
          <label className={OPCION}>
            <input type="radio" value="MONTO_FIJO" {...formulario.register("tipoValor")} className="size-4 accent-primary" />
          </label>
          <MensajeError id="tarifa-tipo-error" mensaje={errores.tipoValor?.message} />
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tarifa-valor" className={ETIQUETA}>
          {etiquetaDelValor(concepto, tipoValor)} <span aria-hidden="true" className="text-rose-600">*</span>
        </label>
        <div className="relative">
          <span aria-hidden="true" className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 font-bold text-slate-500", esPorcentaje ? "right-3" : "left-3")}>
            {esPorcentaje ? "%" : "$"}
          </span>
          <input
            id="tarifa-valor"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            maxLength={14}
            placeholder={esPorcentaje ? "50" : "8.000"}
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
            {esPorcentaje ? "Mayor a 0 y hasta 100; podés usar coma para decimales." : "Mayor a $0; punto para miles y coma para decimales."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tarifa-desde" className={ETIQUETA}>
          Rige desde <span aria-hidden="true" className="text-rose-600">*</span>
        </label>
        <input
          id="tarifa-desde"
          type="date"
          aria-invalid={Boolean(errores.desde)}
          aria-describedby={errores.desde ? "tarifa-desde-error" : "tarifa-desde-ayuda"}
          {...formulario.register("desde")}
          className={CONTROL}
        />
        {errores.desde ? (
          <MensajeError id="tarifa-desde-error" mensaje={errores.desde.message} />
        ) : (
          <p id="tarifa-desde-ayuda" className="text-sm text-muted-foreground">
            Reemplaza a la tarifa actual desde ese día. Las liquidaciones cerradas no cambian.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
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

function ContenidoDialogo({ liquidacion, periodo, onClose }: { liquidacion: LiquidacionResumen; periodo: string; onClose: () => void }) {
  const { data: tarifas, isPending, isError, error, refetch, isFetching } = useTarifas();
  if (isPending) {
    return (
      <div aria-busy="true" aria-label="Cargando las tarifas" className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {mensajeDeErrorApi(error, "No se pudieron cargar las tarifas.")}
        </p>
        <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()} className="rounded-xl font-bold">
          Reintentar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <TarifasVigentes tarifas={tarifas} idProfesora={liquidacion.profesora.id} dia={ultimoDiaDe(periodo)} />
      <FormularioTarifa profesora={liquidacion.profesora} periodo={periodo} tarifas={tarifas} onListo={onClose} />
    </div>
  );
}

interface PropsDialogo {
  /** La profesora cuya tarifa se cambia; null con el diálogo cerrado. */
  liquidacion: LiquidacionResumen | null;
  periodo: string;
  onClose: () => void;
}

export function DialogoTarifa({ liquidacion, periodo, onClose }: PropsDialogo) {
  return (
    <Dialog open={liquidacion !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent hideClose className="w-[96vw] sm:w-full max-w-lg rounded-3xl p-0 shadow-2xl border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-surface-low">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 sm:px-6 text-left">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-extrabold tracking-wider text-primary uppercase">Honorarios</p>
            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Tarifa de {liquidacion ? nombreCompleto(liquidacion.profesora) : ""}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Lo que cobra por cada alumno a cargo y por cada hora que cubre como suplente.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar diálogo de tarifa"
            className="size-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>
        <div className="max-h-[calc(92vh-100px)] overflow-y-auto p-5 sm:p-6">
          {liquidacion && <ContenidoDialogo liquidacion={liquidacion} periodo={periodo} onClose={onClose} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
