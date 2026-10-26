import { useState, type FormEvent } from "react";
import { BadgeCheck } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { esMontoDistinto } from "@/features/alumnos/api/alta-definitiva-api";
import {
  aCuerpoPrimerPago,
  crearPrimerPagoSchema,
  fechaHoraParaInput,
  requiereConfirmarMonto,
  valoresInicialesPrimerPago,
  type CuerpoPrimerPago,
  type PrimerPagoFormValues,
} from "@/features/alumnos/schemas/primer-pago";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import {
  BotonesDeCobro,
  CLASE_INPUT,
  Campo,
  CampoTitularCuenta,
  FechaHoraAutomatica,
  SelectorFormaDeCobro,
  type EtiquetasFormaDeCobro,
} from "@/features/cobros/components/campos-cobro";
import { formatearPrecio, textoHorarios } from "@/features/alumnos/utils/pendientes-de-alta";
import { calcularCotizacionCobro } from "@/features/cobros/api/cobros-api";
import type { Promocion } from "@/types/promocion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import type { FormaPrimerPago, PreInscripcionPendiente } from "@/types/alta-definitiva";

type Errores = Partial<Record<keyof PrimerPagoFormValues, string>>;

function erroresDe(issues: { path: (string | number)[]; message: string }[]): Errores {
  return Object.fromEntries(issues.map((issue) => [issue.path[0], issue.message]));
}

function ResumenPreInscripcion({ pendiente }: { pendiente: PreInscripcionPendiente }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
      <dt className="text-muted-foreground">Plan</dt>
      <dd className="text-right font-bold">
        {pendiente.nombrePlan} · {formatearPrecio(pendiente.precio)}
      </dd>
      <dt className="text-muted-foreground">Profesora</dt>
      <dd className="text-right font-bold">{pendiente.profesora}</dd>
      <dt className="text-muted-foreground">Horario</dt>
      <dd className="text-right font-bold">{textoHorarios(pendiente.horarios)}</dd>
    </dl>
  );
}

// Con la reserva vencida el back vuelve a pedir cupo al dar el alta: se avisa antes de cobrar.
function AvisoReservaVencida({ vence }: { vence: string }) {
  return (
    <Alert className="rounded-xl border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
      <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
        La reserva venció el {formatearFecha(vence)}: el lugar ya no está guardado. Si algún horario se llenó, no se va a poder
        registrar el cobro hasta elegir otro.
      </AlertDescription>
    </Alert>
  );
}

interface ConfirmacionMontoProps {
  mensaje: string;
  marcado: boolean;
  error?: string;
  onChange: (marcado: boolean) => void;
}

function ConfirmacionMonto({ mensaje, marcado, error, onChange }: ConfirmacionMontoProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
      <p role="status" className="text-sm text-amber-900 dark:text-amber-200">
        {mensaje}
      </p>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-bold text-amber-950 dark:text-amber-100">
        <input
          type="checkbox"
          checked={marcado}
          onChange={(evento) => onChange(evento.target.checked)}
          aria-invalid={error !== undefined}
          aria-describedby={error ? "confirmar-monto-error" : undefined}
          className="size-4 accent-primary"
        />
        Confirmo el monto distinto
      </label>
      {error && (
        <p id="confirmar-monto-error" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

interface CamposTransferenciaProps {
  valores: PrimerPagoFormValues;
  errores: Errores;
  onChange: (cambios: Partial<PrimerPagoFormValues>) => void;
}

function CamposTransferencia({ valores, errores, onChange }: CamposTransferenciaProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FechaHoraAutomatica error={errores.fechaHoraTransferencia} />
      <CampoTitularCuenta
        valor={valores.titularCuentaOrigen}
        error={errores.titularCuentaOrigen}
        onChange={(titularCuentaOrigen) => onChange({ titularCuentaOrigen })}
      />
    </div>
  );
}

interface Props {
  pendiente: PreInscripcionPendiente;
  /** Las formas de pago que la sesión puede registrar (al menos una). */
  formas: FormaPrimerPago[];
  confirmando: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: (pago: CuerpoPrimerPago) => void;
  promociones?: Promocion[];
}

// US-07: el alta definitiva es la consecuencia de registrar el primer pago. El back la hace
// en la misma transacción del cobro y no deja activar a nadie sin un pago confirmado.
export function ModalConfirmarAlta({ pendiente, formas, confirmando, error, onClose, onConfirm, promociones = [] }: Props) {
  const { hasRole } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
  const promocionesAplicables = promociones.filter(
    (promocion) =>
      promocion.activo &&
      promocion.estado === "ACTIVA" &&
      promocion.planes.some((plan) => plan.id === pendiente.idPlan),
  );
  const promocionInicial = promocionesAplicables.some((promocion) => promocion.id === String(pendiente.idPromocion))
    ? String(pendiente.idPromocion)
    : "SIN_PROMOCION";
  const [promocionSeleccionada, setPromocionSeleccionada] = useState(promocionInicial);
  const cotizacion = calcularCotizacionCobro(
    {
      id: Number(pendiente.idInscripcion),
      idPlan: Number(pendiente.idPlan),
      precioLista: pendiente.precio,
      idPromocion: promocionSeleccionada === "SIN_PROMOCION" ? null : Number(promocionSeleccionada),
    },
    promocionesAplicables,
  );
  const [valores, setValores] = useState(() => valoresInicialesPrimerPago(cotizacion.monto, formas[0]));
  const [errores, setErrores] = useState<Errores>({});
  const backInformoMontoDistinto = esMontoDistinto(error);
  const contexto = { precio: cotizacion.monto, backInformoMontoDistinto };
  const nombre = `${pendiente.nombre} ${pendiente.apellido}`;

  const etiquetasForma: EtiquetasFormaDeCobro = {
    EFECTIVO: { titulo: "Efectivo", detalle: "Lo cobraste en el centro." },
    TRANSFERENCIA: {
      titulo: "Transferencia",
      detalle: esPropietaria ? "Ya la viste acreditada en tu cuenta." : "Queda pendiente de confirmación por la propietaria.",
    },
  };

  const esTransferenciaProfesora = valores.formaPago === "TRANSFERENCIA" && !esPropietaria;

  const cambiar = (cambios: Partial<PrimerPagoFormValues>) => {
    setValores((actuales) => ({ ...actuales, ...cambios }));
    setErrores({});
  };

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault();
    // La transferencia queda con el momento de la confirmación, en minutos: así nunca es futura.
    const aRegistrar =
      valores.formaPago === "TRANSFERENCIA" ? { ...valores, fechaHoraTransferencia: fechaHoraParaInput(new Date()) } : valores;
    const resultado = crearPrimerPagoSchema({ ...contexto, ahora: new Date() }).safeParse(aRegistrar);
    if (!resultado.success) {
      setErrores(erroresDe(resultado.error.issues));
      return;
    }
    onConfirm(
      aCuerpoPrimerPago(
        pendiente.idInscripcion,
        resultado.data,
        promocionSeleccionada === "SIN_PROMOCION" ? undefined : Number(promocionSeleccionada),
      ),
    );
  };

  const mensajeMonto = backInformoMontoDistinto
    ? mensajeDeErrorApi(error, "El monto no coincide con el precio vigente del plan.")
    : `El precio del plan es ${formatearPrecio(cotizacion.monto)}.`;
  const errorGeneral = error && !backInformoMontoDistinto ? mensajeDeErrorApi(error, "No se pudo registrar el cobro.") : null;

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !confirmando) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl border-border p-6 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              <BadgeCheck className="size-5" />
            </span>
            <DialogTitle className="text-base font-extrabold text-dark dark:text-white">Confirmar alta de {nombre}</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              {esTransferenciaProfesora
                ? "Informá los datos de la transferencia. Al guardarla, quedará pendiente de confirmación por la propietaria para dar el alta definitiva."
                : "Registrá el cobro o la transferencia de su primera cuota. Al guardarlo, queda activo e inscripto en el plan y los horarios que eligió."}
            </DialogDescription>
          </div>

          <ResumenPreInscripcion pendiente={pendiente} />
          {pendiente.reserva?.vencida && <AvisoReservaVencida vence={pendiente.reserva.vence} />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="promocion-primer-pago" className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Promoción
            </label>
            <Select value={promocionSeleccionada} onValueChange={(valor) => {
              setPromocionSeleccionada(valor);
              const nuevaCotizacion = calcularCotizacionCobro(
                {
                  id: Number(pendiente.idInscripcion),
                  idPlan: Number(pendiente.idPlan),
                  precioLista: pendiente.precio,
                  idPromocion: valor === "SIN_PROMOCION" ? null : Number(valor),
                },
                promocionesAplicables,
              );
              cambiar({ monto: String(nuevaCotizacion.monto).replace(".", ","), confirmarMontoDistinto: false });
            }}>
              <SelectTrigger id="promocion-primer-pago" className="h-11 rounded-xl border-slate-200 dark:border-white/15">
                <SelectValue placeholder="Sin promoción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIN_PROMOCION">Sin promoción</SelectItem>
                {promocionesAplicables.map((promocion) => (
                  <SelectItem key={promocion.id} value={promocion.id}>
                    {promocion.nombre} · {promocion.tipoDescuento === "PORCENTAJE" ? `${promocion.valor}% OFF` : `${formatearPrecio(promocion.valor)} OFF`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {promocionesAplicables.length === 0 && (
              <p className="text-xs text-muted-foreground">No hay promociones activas para este plan.</p>
            )}
          </div>
          <SelectorFormaDeCobro
            formas={formas}
            valor={valores.formaPago}
            onChange={(formaPago) => cambiar({ formaPago })}
            leyenda="¿Cómo abonó la primera cuota?"
            etiquetas={etiquetasForma}
          />

          <Campo id="monto-primer-pago" etiqueta="Monto cobrado" ayuda="Sin puntos de miles, por ejemplo 25000 o 25000,50." error={errores.monto} obligatorio>
            {(describedBy) => (
              <Input
                id="monto-primer-pago"
                inputMode="decimal"
                value={valores.monto}
                onChange={(evento) => cambiar({ monto: evento.target.value })}
                aria-invalid={errores.monto !== undefined}
                aria-describedby={describedBy}
                className={CLASE_INPUT}
              />
            )}
          </Campo>

          {requiereConfirmarMonto(valores.monto, contexto) && (
            <ConfirmacionMonto
              mensaje={mensajeMonto}
              marcado={valores.confirmarMontoDistinto}
              error={errores.confirmarMontoDistinto}
              onChange={(confirmarMontoDistinto) => cambiar({ confirmarMontoDistinto })}
            />
          )}

          {valores.formaPago === "TRANSFERENCIA" && <CamposTransferencia valores={valores} errores={errores} onChange={cambiar} />}

          {errorGeneral && (
            <Alert role="alert" className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
              <AlertDescription className="text-sm text-rose-900 dark:text-rose-200">{errorGeneral}</AlertDescription>
            </Alert>
          )}

          <BotonesDeCobro
            onCancelar={onClose}
            enviando={confirmando}
            texto={esTransferenciaProfesora ? "Informar transferencia" : "Registrar y dar de alta"}
            textoEnviando={esTransferenciaProfesora ? "Informando..." : "Registrando..."}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
