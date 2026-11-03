import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMinutoActual } from "@/hooks/use-minuto-actual";
import { cn } from "@/utils/cn";

// Piezas de los formularios de cobro: "Confirmar alta" (US-07) y "Registrar cobro" en Estado de
// cuotas (US-15/16). Compartirlas mantiene los dos formularios iguales a la vista.

export type FormaDeCobro = "EFECTIVO" | "TRANSFERENCIA";

export type EtiquetasFormaDeCobro = Record<FormaDeCobro, { titulo: string; detalle: string }>;

export const CLASE_INPUT = "rounded-xl border-slate-200 bg-white dark:border-white/15 dark:bg-transparent";

interface CampoProps {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  obligatorio?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
}

/** Etiqueta, control, ayuda y error, enlazados para el lector de pantalla. */
export function Campo({ id, etiqueta, error, ayuda, obligatorio = false, children }: CampoProps) {
  const describedBy = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {etiqueta}
        {obligatorio && (
          <>
            <span className="text-rose-600" aria-hidden="true"> *</span>
            <span className="sr-only"> (obligatorio)</span>
          </>
        )}
      </Label>
      {children(describedBy)}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectorFormaDeCobroProps {
  formas: FormaDeCobro[];
  valor: FormaDeCobro;
  onChange: (forma: FormaDeCobro) => void;
  leyenda: string;
  etiquetas: EtiquetasFormaDeCobro;
}

/** Efectivo o transferencia, como tarjetas seleccionables. */
export function SelectorFormaDeCobro({ formas, valor, onChange, leyenda, etiquetas }: SelectorFormaDeCobroProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">{leyenda}</legend>
      <RadioGroup value={valor} onValueChange={(v) => onChange(v as FormaDeCobro)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {formas.map((forma) => (
          <Label
            key={forma}
            htmlFor={`forma-pago-${forma}`}
            className="flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-pink-50 dark:border-white/15 dark:has-data-[state=checked]:bg-primary/15"
          >
            <RadioGroupItem id={`forma-pago-${forma}`} value={forma} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{etiquetas[forma].titulo}</span>
              <span className="text-xs font-medium text-muted-foreground">{etiquetas[forma].detalle}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

// "13/10/2026, 23:50": la fecha y hora con que se va a registrar la transferencia.
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

/**
 * La transferencia se registra con el momento en que se confirma: no se carga a mano. Se muestra
 * igual, de solo lectura, para que se vea con qué fecha y hora va a quedar.
 */
export function FechaHoraAutomatica({ error }: { error?: string }) {
  const ahora = useMinutoActual();
  return (
    <Campo id="fecha-hora-transferencia" etiqueta="Fecha y hora" ayuda="Se registra automáticamente con la fecha y hora actual." error={error}>
      {(describedBy) => (
        <div className="relative">
          <Input
            id="fecha-hora-transferencia"
            readOnly
            value={FORMATO_FECHA_HORA.format(ahora)}
            aria-invalid={error !== undefined}
            aria-describedby={describedBy}
            className={cn(CLASE_INPUT, "cursor-default bg-slate-50 pr-10 text-slate-600 tabular-nums dark:bg-white/5 dark:text-slate-300")}
          />
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      )}
    </Campo>
  );
}

interface CampoTitularProps {
  valor: string;
  error?: string;
  onChange: (valor: string) => void;
}

export function CampoTitularCuenta({ valor, error, onChange }: CampoTitularProps) {
  return (
    <Campo id="titular-cuenta" etiqueta="Titular de la cuenta" ayuda="Opcional: ayuda a encontrarla en el extracto." error={error}>
      {(describedBy) => (
        <Input
          id="titular-cuenta"
          value={valor}
          maxLength={80}
          autoComplete="off"
          onChange={(evento) => onChange(evento.target.value)}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy}
          className={CLASE_INPUT}
        />
      )}
    </Campo>
  );
}

interface BotonesDeCobroProps {
  onCancelar: () => void;
  enviando: boolean;
  texto: string;
  textoEnviando: string;
}

/** Pie de los formularios de cobro: cancelar y la acción principal, que es el envío del form. */
export function BotonesDeCobro({ onCancelar, enviando, texto, textoEnviando }: BotonesDeCobroProps) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-row items-center justify-end gap-2 bg-background/95 pt-3 pb-1 backdrop-blur-sm">
      <Button
        type="button"
        variant="outline"
        disabled={enviando}
        onClick={onCancelar}
        className="rounded-xl border-slate-200 px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={enviando} className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark">
        {enviando ? textoEnviando : texto}
      </Button>
    </div>
  );
}
