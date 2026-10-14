import { useState, type FormEvent } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { fechaHoraParaInput } from "@/features/alumnos/schemas/primer-pago";
import {
  BotonesDeCobro,
  CLASE_INPUT,
  Campo,
  CampoTitularCuenta,
  FechaHoraAutomatica,
} from "@/features/cobros/components/campos-cobro";
import { montoComoNumero } from "@/features/cobros/schemas/cobro-efectivo.schema";
import { informarTransferenciaCobroSchema } from "@/features/cobros/schemas/transferencia-cobro.schema";
import { useInformarTransferencia } from "@/features/transferencias/hooks/use-transferencias";
import { formatearPrecio } from "@/utils/moneda";

type Errores = Partial<Record<"monto" | "titular", string>>;

interface Props {
  idInscripcion: number;
  precioVigente: number;
  /** El monto lo guarda el modal: así no se pierde al pasar de efectivo a transferencia y volver. */
  monto: string;
  onMontoChange: (monto: string) => void;
  onCancelar: () => void;
  onInformada: () => void;
}

/**
 * Transferencia que avisa el alumno a la propietaria o a su profesora (decisión de la dueña: el
 * alumno ya no la informa desde la app). Queda pendiente de verificación en "Transferencias
 * pendientes" hasta que la propietaria la controle en el extracto (US-17).
 */
export function FormularioTransferenciaCobro({ idInscripcion, precioVigente, monto, onMontoChange, onCancelar, onInformada }: Props) {
  const informar = useInformarTransferencia();
  const [titular, setTitular] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);

  const montoNumerico = montoComoNumero(monto);
  const esDistinto = Number.isFinite(montoNumerico) && montoNumerico > 0 && montoNumerico !== precioVigente;

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    setErrorApi(null);
    const resultado = informarTransferenciaCobroSchema.safeParse({ monto, titular });
    if (!resultado.success) {
      setErrores(Object.fromEntries(resultado.error.issues.map((issue) => [issue.path[0], issue.message])));
      return;
    }
    try {
      await informar.mutateAsync({
        id_inscripcion: idInscripcion,
        monto: montoComoNumero(resultado.data.monto),
        // Se registra con el momento de la confirmación, en minutos: así nunca es futura.
        fecha_hora_transferencia: fechaHoraParaInput(new Date()),
        titular_cuenta_origen: resultado.data.titular || undefined,
      });
      toast.success("Transferencia informada: queda pendiente de verificación.");
      onInformada();
    } catch (error) {
      setErrorApi(mensajeDeErrorApi(error, "No se pudo informar la transferencia."));
    }
  }

  return (
    <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
      <Campo id="monto-transferencia" etiqueta="Monto transferido" ayuda="Sin puntos de miles, por ejemplo 25000 o 25000,50." error={errores.monto} obligatorio>
        {(describedBy) => (
          <Input
            id="monto-transferencia"
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
      {/* Como en el back: un monto distinto se acepta al informar y se confirma al aprobarla. */}
      {esDistinto && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Es distinto del precio del plan ({formatearPrecio(precioVigente)}): la propietaria lo confirma al aprobar la transferencia.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FechaHoraAutomatica />
        <CampoTitularCuenta
          valor={titular}
          error={errores.titular}
          onChange={(valor) => {
            setTitular(valor);
            setErrores((previos) => ({ ...previos, titular: undefined }));
          }}
        />
      </div>
      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
        <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          Queda <strong>pendiente de verificación</strong> en "Transferencias pendientes" hasta que la propietaria la controle en
          el extracto.
        </span>
      </p>
      {errorApi && (
        <Alert role="alert" className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <AlertDescription className="text-sm text-rose-900 dark:text-rose-200">{errorApi}</AlertDescription>
        </Alert>
      )}
      <BotonesDeCobro onCancelar={onCancelar} enviando={informar.isPending} texto="Informar transferencia" textoEnviando="Informando..." />
    </form>
  );
}
