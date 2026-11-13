import { useState, type FormEvent, type ReactNode } from "react";
import { Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModalCuerpo, ModalFormulario } from "@/components/ui/estructura-modal";
import { Input } from "@/components/ui/input";
import { ALUMNOS_QUERY_KEY } from "@/features/alumnos/hooks/use-alumnos";
import { fechaHoraParaInput } from "@/features/alumnos/schemas/primer-pago";
import { registrarCobroTransferenciaRecibida } from "@/features/cobros/api/cobros-api";
import {
  BotonesDeCobro,
  CLASE_INPUT,
  Campo,
  CampoTitularCuenta,
} from "@/features/cobros/components/campos-cobro";
import { montoComoNumero } from "@/features/cobros/schemas/cobro-efectivo.schema";
import { informarTransferenciaCobroSchema } from "@/features/cobros/schemas/transferencia-cobro.schema";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { TRANSFERENCIAS_QUERY_KEY, useInformarTransferencia } from "@/features/transferencias/hooks/use-transferencias";
import { formatearPrecio } from "@/utils/moneda";

type Errores = Partial<Record<"monto" | "titular", string>>;

interface Props {
  idInscripcion: number;
  idPromocion?: number;
  precioVigente: number;
  /** El monto lo guarda el modal: así no se pierde al pasar de efectivo a transferencia y volver. */
  monto: string;
  onMontoChange: (monto: string) => void;
  titularInicial?: string;
  onCancelar: () => void;
  /** Lo que el modal muestra antes de los campos (detalle del cobro, descuento, forma de cobro). */
  encabezado?: ReactNode;
  onInformada: () => void;
  onExito?: (idPago: number) => void;
}

/**
 * Cobro o aviso de transferencia bancaria. Si quien cobra es la propietaria, queda confirmada en el
 * acto; si es una profesora, queda pendiente de verificación en el extracto (US-17).
 */
export function FormularioTransferenciaCobro({
  idInscripcion,
  idPromocion,
  precioVigente,
  monto,
  onMontoChange,
  titularInicial = "",
  onCancelar,
  encabezado,
  onInformada,
  onExito,
}: Props) {
  const { hasRole } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
  const queryClient = useQueryClient();
  const informar = useInformarTransferencia();
  const [enviandoDirecto, setEnviandoDirecto] = useState(false);
  const [titular, setTitular] = useState(titularInicial);
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
    const montoFinal = montoComoNumero(resultado.data.monto);
    const fechaHora = fechaHoraParaInput(new Date());
    const titularLimpio = resultado.data.titular || undefined;

    if (esPropietaria) {
      setEnviandoDirecto(true);
      try {
        const pago = await registrarCobroTransferenciaRecibida({
          id_inscripcion: idInscripcion,
          id_promocion: idPromocion,
          monto: montoFinal,
          fecha_hora_transferencia: fechaHora,
          titular_cuenta_origen: titularLimpio,
          confirmar_monto_distinto: esDistinto,
        });
        void queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ["pagos"] });
        void queryClient.invalidateQueries({ queryKey: TRANSFERENCIAS_QUERY_KEY });
        toast.success("Cobro por transferencia registrado correctamente");
        if (onExito) {
          onExito(pago.id_pago);
        } else {
          onInformada();
        }
      } catch (error) {
        setErrorApi(mensajeDeErrorApi(error, "No se pudo registrar la transferencia."));
      } finally {
        setEnviandoDirecto(false);
      }
      return;
    }

    try {
      await informar.mutateAsync({
        id_inscripcion: idInscripcion,
        id_promocion: idPromocion,
        monto: montoFinal,
        fecha_hora_transferencia: fechaHora,
        titular_cuenta_origen: titularLimpio,
      });
      toast.success("Transferencia informada: queda pendiente de verificación.");
      onInformada();
    } catch (error) {
      setErrorApi(mensajeDeErrorApi(error, "No se pudo informar la transferencia."));
    }
  }

  const enviando = informar.isPending || enviandoDirecto;

  return (
    <ModalFormulario onSubmit={confirmar}>
      <ModalCuerpo>
      {encabezado}
      <Campo id="monto-transferencia" etiqueta="Monto" error={errores.monto}>
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
      {esDistinto && !esPropietaria && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Es distinto del precio del plan ({formatearPrecio(precioVigente)}): la propietaria lo confirma al aprobar la transferencia.
        </p>
      )}
      <CampoTitularCuenta
        valor={titular}
        etiqueta="Titular cuenta"
        error={errores.titular}
        onChange={(valor) => {
          setTitular(valor);
          setErrores((previos) => ({ ...previos, titular: undefined }));
        }}
      />
      {!esPropietaria && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
          <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Queda <strong>pendiente de verificación</strong> hasta que la propietaria la controle en el extracto.
          </span>
        </p>
      )}
      {errorApi && (
        <Alert role="alert" className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <AlertDescription className="text-sm text-rose-900 dark:text-rose-200">{errorApi}</AlertDescription>
        </Alert>
      )}
      </ModalCuerpo>
      <BotonesDeCobro
        onCancelar={onCancelar}
        enviando={enviando}
        texto={esPropietaria ? "Confirmar cobro" : "Informar transferencia"}
        textoEnviando={esPropietaria ? "Registrando cobro..." : "Informando..."}
      />
    </ModalFormulario>
  );
}
