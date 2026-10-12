import { useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { LARGO_MAXIMO_DETALLE_BAJA, bajaAlumnoFormSchema } from "@/features/alumnos/schemas/alumno";
import type { MotivoBaja } from "@/types/alumno";

const ETIQUETAS_MOTIVO: Record<MotivoBaja, string> = {
  ABANDONO: "Dejó de asistir",
  MUDANZA: "Mudanza",
  SALUD: "Salud",
  ECONOMICO: "Motivos económicos",
  OTRO: "Otro motivo",
};

const MOTIVOS = Object.keys(ETIQUETAS_MOTIVO) as MotivoBaja[];

interface Props {
  /** Nombre y apellido del alumno. */
  nombre: string;
  dandoDeBaja: boolean;
  errorBaja: string | null;
  onClose: () => void;
  /** `detalle` solo llega con "Otro motivo" y si se escribió algo. */
  onConfirm: (motivo: MotivoBaja, detalle?: string) => void;
}

// US-08: la baja es lógica y conserva el historial. El motivo se guarda en inscripciones.motivo_baja.
export function ModalBajaAlumno({ nombre, dandoDeBaja, errorBaja, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState<string>("");
  const [detalle, setDetalle] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const esOtroMotivo = motivo === "OTRO";

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = bajaAlumnoFormSchema.safeParse({ motivo: motivo || undefined, detalle: esOtroMotivo ? detalle : undefined });
    if (!resultado.success) {
      const { fieldErrors } = resultado.error.flatten();
      setErrorMotivo(fieldErrors.motivo?.[0] ?? null);
      setErrorDetalle(fieldErrors.detalle?.[0] ?? null);
      return;
    }
    const { motivo: motivoElegido, detalle: detalleEscrito } = resultado.data;
    if (detalleEscrito) onConfirm(motivoElegido, detalleEscrito);
    else onConfirm(motivoElegido);
  };

  const elegirMotivo = (valor: string) => {
    setMotivo(valor);
    setErrorMotivo(null);
  };

  return (
    <AlertDialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !dandoDeBaja) onClose();
      }}
    >
      <AlertDialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl border-border p-6 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
          <AlertDialogHeader className="space-y-4">
            <div
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
            >
              <TriangleAlert className="size-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-extrabold text-dark dark:text-white">
                ¿Dar de baja a {nombre}?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                El alumno quedará inactivo pero se conservará todo su historial de cuotas y asistencias. Va a
                poder reactivarse más adelante.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <fieldset className="flex flex-col gap-2" aria-describedby={errorMotivo ? "error-motivo-baja" : undefined}>
            <legend className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              Motivo de la baja <span className="text-rose-600" aria-hidden="true">*</span>
              <span className="sr-only">(obligatorio)</span>
            </legend>
            <RadioGroup
              value={motivo}
              onValueChange={elegirMotivo}
              aria-invalid={errorMotivo !== null}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {MOTIVOS.map((valor) => (
                <Label
                  key={valor}
                  htmlFor={`motivo-baja-${valor}`}
                  className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-pink-50 dark:border-white/15 dark:text-slate-200 dark:has-data-[state=checked]:bg-primary/15"
                >
                  <RadioGroupItem id={`motivo-baja-${valor}`} value={valor} />
                  {ETIQUETAS_MOTIVO[valor]}
                </Label>
              ))}
            </RadioGroup>
            {errorMotivo && (
              <p id="error-motivo-baja" role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                {errorMotivo}
              </p>
            )}
          </fieldset>

          {esOtroMotivo && (
            <DetalleOtroMotivo
              valor={detalle}
              error={errorDetalle}
              onChange={(valor) => {
                setDetalle(valor);
                setErrorDetalle(null);
              }}
            />
          )}

          {errorBaja && (
            <Alert className="rounded-xl border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">{errorBaja}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-2">
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                disabled={dandoDeBaja}
                className="rounded-xl border-slate-200 px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
              >
                Cancelar
              </Button>
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={dandoDeBaja}
              className="rounded-xl bg-rose-600 px-4 font-bold text-white shadow-md hover:bg-rose-700"
            >
              {dandoDeBaja ? "Dando de baja..." : "Confirmar baja"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface PropsDetalle {
  valor: string;
  error: string | null;
  onChange: (valor: string) => void;
}

function DetalleOtroMotivo({ valor, error, onChange }: PropsDetalle) {
  const idAyuda = "ayuda-detalle-baja";
  const idError = "error-detalle-baja";
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="detalle-baja" className="text-sm font-bold text-slate-800 dark:text-slate-200">
        ¿Cuál es el motivo? <span className="font-medium text-muted-foreground">(opcional)</span>
      </Label>
      {/* Aparece al elegir "Otro motivo": el foco va directo a la caja para escribir. */}
      <Textarea
        id="detalle-baja"
        autoFocus
        rows={3}
        value={valor}
        maxLength={LARGO_MAXIMO_DETALLE_BAJA}
        onChange={(evento) => onChange(evento.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error ? `${idAyuda} ${idError}` : idAyuda}
        placeholder="Por ejemplo: cambió de horario de trabajo"
        className="rounded-xl border-slate-200 text-sm dark:border-white/15"
      />
      <p id={idAyuda} className="text-right text-xs text-muted-foreground">
        {valor.length}/{LARGO_MAXIMO_DETALLE_BAJA}
      </p>
      {error && (
        <p id={idError} role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
