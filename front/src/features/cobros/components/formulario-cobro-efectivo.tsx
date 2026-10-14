import { useState, type FormEvent } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { esMontoDistinto } from "@/features/cobros/api/cobros-api";
import { BotonesDeCobro, CLASE_INPUT, Campo } from "@/features/cobros/components/campos-cobro";
import { useRegistrarCobroEfectivo } from "@/features/cobros/hooks/use-cobros";
import {
  aCuerpoCobroEfectivo,
  montoComoNumero,
  registrarCobroEfectivoFormSchema,
  type RegistrarCobroEfectivoFormValues,
} from "@/features/cobros/schemas/cobro-efectivo.schema";
import { formatearPrecio } from "@/utils/moneda";

type Errores = Partial<Record<keyof RegistrarCobroEfectivoFormValues, string>>;

interface Props {
  idInscripcion: number;
  precioVigente: number;
  /** El monto lo guarda el modal: así no se pierde al pasar de efectivo a transferencia y volver. */
  monto: string;
  onMontoChange: (monto: string) => void;
  onCancelar: () => void;
  /** Con el id del pago, para mostrar su comprobante. */
  onExito: (idPago: number) => void;
}

// US-19: el efectivo que cobra una profesora queda a su cargo hasta rendirlo.
function AvisoRendicion() {
  return (
    <Alert className="rounded-xl border-amber-200 bg-amber-50 py-2.5 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
      <Info className="size-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-sm">
        Este cobro en efectivo quedará registrado a tu cargo como <strong>pendiente de rendición </strong>
        hasta entregarlo a la administración.
      </AlertDescription>
    </Alert>
  );
}

interface ConfirmacionMontoProps {
  monto: number;
  precio: number;
  marcado: boolean;
  error?: string;
  onChange: (marcado: boolean) => void;
}

function ConfirmacionMontoDistinto({ monto, precio, marcado, error, onChange }: ConfirmacionMontoProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          El monto ingresado (<strong>{formatearPrecio(monto)}</strong>) no coincide con el valor del plan (
          <strong>{formatearPrecio(precio)}</strong>).
        </p>
      </div>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 font-bold text-amber-950 dark:text-amber-100">
        <input
          type="checkbox"
          checked={marcado}
          onChange={(evento) => onChange(evento.target.checked)}
          aria-invalid={error !== undefined}
          aria-describedby={error ? "confirmar-monto-cobro-error" : undefined}
          className="size-4 accent-primary"
        />
        Confirmo que el cobro es por un monto distinto al precio vigente
      </label>
      {error && (
        <p id="confirmar-monto-cobro-error" className="font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

/** US-15: cobro en efectivo de la cuota. Queda confirmado en el acto y emite el comprobante. */
export function FormularioCobroEfectivo({ idInscripcion, precioVigente, monto, onMontoChange, onCancelar, onExito }: Props) {
  const { hasRole } = usePermissions();
  const esSoloProfesora = hasRole("PROFESORA") && !hasRole("PROPIETARIA");
  const registrar = useRegistrarCobroEfectivo();
  const [confirmarMontoDistinto, setConfirmarMontoDistinto] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);

  const montoNumerico = montoComoNumero(monto);
  const esDistinto = Number.isFinite(montoNumerico) && montoNumerico > 0 && montoNumerico !== precioVigente;

  function validar(): RegistrarCobroEfectivoFormValues | null {
    const resultado = registrarCobroEfectivoFormSchema.safeParse({
      idInscripcion,
      monto,
      confirmarMontoDistinto,
      observaciones: observaciones || undefined,
    });
    if (!resultado.success) {
      setErrores(Object.fromEntries(resultado.error.issues.map((issue) => [issue.path[0], issue.message])));
      return null;
    }
    if (esDistinto && !confirmarMontoDistinto) {
      setErrores({ confirmarMontoDistinto: "Debés confirmar que el monto a cobrar es distinto del precio del plan." });
      return null;
    }
    setErrores({});
    return resultado.data;
  }

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    setErrorApi(null);
    const datos = validar();
    if (!datos) return;
    try {
      const pago = await registrar.mutateAsync(aCuerpoCobroEfectivo(datos));
      toast.success("Cobro en efectivo registrado correctamente");
      onExito(pago.id_pago);
    } catch (error) {
      setErrorApi(
        esMontoDistinto(error)
          ? `El monto cobrado difiere del precio vigente (${formatearPrecio(precioVigente)}). Para registrarlo, marcá la casilla de confirmación.`
          : mensajeDeErrorApi(error, "No se pudo registrar el cobro en efectivo."),
      );
    }
  }

  return (
    <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
      {esSoloProfesora && <AvisoRendicion />}
      <Campo id="monto-cobro" etiqueta="Monto cobrado" ayuda="Sin puntos de miles, por ejemplo 25000 o 25000,50." error={errores.monto} obligatorio>
        {(describedBy) => (
          <Input
            id="monto-cobro"
            inputMode="decimal"
            value={monto}
            onChange={(evento) => {
              onMontoChange(evento.target.value);
              setErrores((previos) => ({ ...previos, monto: undefined }));
            }}
            aria-invalid={errores.monto !== undefined}
            aria-describedby={describedBy}
            className={CLASE_INPUT}
          />
        )}
      </Campo>
      {esDistinto && (
        <ConfirmacionMontoDistinto
          monto={montoNumerico}
          precio={precioVigente}
          marcado={confirmarMontoDistinto}
          error={errores.confirmarMontoDistinto}
          onChange={(marcado) => {
            setConfirmarMontoDistinto(marcado);
            setErrores((previos) => ({ ...previos, confirmarMontoDistinto: undefined }));
          }}
        />
      )}
      <Campo id="observaciones-cobro" etiqueta="Observaciones (opcional)" error={errores.observaciones}>
        {(describedBy) => (
          <Textarea
            id="observaciones-cobro"
            value={observaciones}
            onChange={(evento) => setObservaciones(evento.target.value)}
            maxLength={255}
            rows={2}
            aria-describedby={describedBy}
            placeholder="Anotaciones sobre el cobro o descuento especial..."
            className={CLASE_INPUT}
          />
        )}
      </Campo>
      {errorApi && (
        <Alert role="alert" className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <AlertDescription className="text-sm text-rose-900 dark:text-rose-200">{errorApi}</AlertDescription>
        </Alert>
      )}
      <BotonesDeCobro onCancelar={onCancelar} enviando={registrar.isPending} texto="Confirmar cobro" textoEnviando="Registrando cobro..." />
    </form>
  );
}
