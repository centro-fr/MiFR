import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SituacionCuota } from "@/features/alumnos/schemas/alumno";
import {
  SelectorFormaDeCobro,
  type EtiquetasFormaDeCobro,
  type FormaDeCobro,
} from "@/features/cobros/components/campos-cobro";
import { FormularioCobroEfectivo } from "@/features/cobros/components/formulario-cobro-efectivo";
import { FormularioTransferenciaCobro } from "@/features/cobros/components/formulario-transferencia-cobro";
import { formatearPrecio } from "@/utils/moneda";
import { calcularCotizacionCobro, type CotizacionCobro } from "@/features/cobros/api/cobros-api";
import type { Promocion } from "@/types/promocion";
import type { Plan } from "@/types/plan";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";

export interface DatosAlumnoCobro {
  id_alumno: number;
  nombre: string;
  apellido: string;
  dni: string | null;
}

export interface DatosInscripcionCobro {
  id_inscripcion: number;
  id_plan?: number;
  nombre_plan: string;
  precio_vigente: number;
  situacion_cuota?: SituacionCuota | null;
  cotizacion?: CotizacionCobro;
}

interface Props {
  abierto: boolean;
  onClose: () => void;
  alumno: DatosAlumnoCobro;
  inscripcion: DatosInscripcionCobro;
  cotizacion?: CotizacionCobro;
  cargandoCotizacion?: boolean;
  errorCotizacion?: boolean;
  promociones?: Promocion[];
  plan?: Pick<Plan, "id" | "nombre">;
  /** Forma de cobro preseleccionada al abrir desde un botón puntual ("Cobrar Efectivo" o "Cobrar Transferencia"). */
  formaInicial?: FormaDeCobro;
  /** Si se indica la forma desde el botón de la tabla, oculta el selector de forma dentro del modal. */
  ocultarSelectorForma?: boolean;
  /** Cobro en efectivo registrado: con el id del pago, para mostrar su comprobante. */
  onExito: (idPago: number) => void;
  /** Transferencia informada: queda pendiente de verificación, no tiene comprobante todavía. */
  onTransferenciaInformada?: () => void;
}

const FORMAS: FormaDeCobro[] = ["EFECTIVO", "TRANSFERENCIA"];

const ETIQUETAS: EtiquetasFormaDeCobro = {
  EFECTIVO: { titulo: "Efectivo" },
  TRANSFERENCIA: { titulo: "Transferencia" },
};

const TEXTO_ESTADO_CUOTA: Record<SituacionCuota["estado"], string> = {
  AL_DIA: "Al día",
  POR_VENCER: "Por vencer",
  VENCIDA: "Vencida",
  CLASE_SUELTA_VIGENTE: "Clase suelta vigente",
  CLASE_SUELTA_VENCIDA: "Clase suelta vencida",
  PENDIENTE_DE_PAGO: "Pendiente de pago",
};

function ResumenCobro({ alumno, inscripcion }: Pick<Props, "alumno" | "inscripcion">) {
  const cotizacion = inscripcion.cotizacion;
  const precioLista = cotizacion?.precio_lista ?? inscripcion.precio_vigente;
  const monto = cotizacion?.monto ?? inscripcion.precio_vigente;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Detalle cobro</span>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-sm dark:border-white/10 dark:bg-white/5">
        <dt className="text-muted-foreground">Alumno</dt>
        <dd className="text-right font-medium text-slate-900 dark:text-slate-100">
          {alumno.nombre} {alumno.apellido}
        </dd>
        <dt className="text-muted-foreground">Plan</dt>
        <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{inscripcion.nombre_plan}</dd>
        <dt className="text-muted-foreground">Precio de lista</dt>
        <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{formatearPrecio(precioLista)}</dd>
        {cotizacion && cotizacion.descuento > 0 && (
          <>
            <dt className="text-muted-foreground">Descuento</dt>
            <dd className="text-right font-medium text-slate-900 dark:text-slate-100">
              {cotizacion.promocion?.nombre ?? "Descuento"} · −{formatearPrecio(cotizacion.descuento)}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Total a cobrar</dt>
        <dd className="text-right font-bold text-slate-900 dark:text-white">{formatearPrecio(monto)}</dd>
        {inscripcion.situacion_cuota && (
          <>
            <dt className="text-muted-foreground">Cuota</dt>
            <dd className="text-right font-medium text-slate-700 dark:text-slate-300">
              {TEXTO_ESTADO_CUOTA[inscripcion.situacion_cuota.estado]}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function SelectorPromocion({
  promociones,
  seleccionada,
  onChange,
}: {
  promociones: Promocion[];
  seleccionada: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="promocion-cobro" className="text-sm font-bold text-slate-800 dark:text-slate-200">
        Descuento
      </label>
      <Select value={seleccionada} onValueChange={onChange}>
        <SelectTrigger id="promocion-cobro" className="h-11 rounded-xl border-slate-200 dark:border-white/15">
          <SelectValue placeholder="Sin promoción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="SIN_PROMOCION">Sin promoción</SelectItem>
          {promociones.map((promocion) => (
            <SelectItem key={promocion.id} value={promocion.id}>
              {promocion.nombre} · {promocion.tipoDescuento === "PORCENTAJE" ? `${promocion.valor}% OFF` : `${formatearPrecio(promocion.valor)} OFF`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Cobro de la cuota desde el listado de alumnos o cobros de la profesora: en efectivo o por
 * transferencia.
 */
export function ModalRegistrarCobro({
  abierto,
  onClose,
  alumno,
  inscripcion,
  cotizacion,
  cargandoCotizacion = false,
  errorCotizacion = false,
  promociones = [],
  formaInicial = "EFECTIVO",
  ocultarSelectorForma = false,
  onExito,
  onTransferenciaInformada,
}: Props) {
  const { hasRole } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
  const [forma, setForma] = useState<FormaDeCobro>(formaInicial);
  useEffect(() => {
    setForma(formaInicial);
  }, [formaInicial]);
  const [monto, setMonto] = useState(String(inscripcion.precio_vigente));
  const [promocionSeleccionada, setPromocionSeleccionada] = useState("SIN_PROMOCION");
  // La cotización llega de forma asíncrona y debe sincronizar el selector local del formulario.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPromocionSeleccionada(cotizacion?.promocion ? String(cotizacion.promocion.id_promocion) : "SIN_PROMOCION");
  }, [cotizacion?.promocion]);

  const cotizacionActual = calcularCotizacionCobro(
    {
      id: inscripcion.id_inscripcion,
      precioLista: inscripcion.precio_vigente,
      idPromocion: promocionSeleccionada === "SIN_PROMOCION" ? null : Number(promocionSeleccionada),
      idPlan: inscripcion.id_plan ?? 0,
    },
    promociones,
  );
  // El monto editable se actualiza al cambiar la promoción o la cotización vigente.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonto(String(cotizacionActual.monto));
  }, [cotizacionActual.monto]);

  const inscripcionConCotizacion = { ...inscripcion, cotizacion: cotizacionActual };
  const titulo =
    forma === "EFECTIVO"
      ? "Registrar cobro en efectivo"
      : esPropietaria
        ? "Registrar cobro por transferencia"
        : "Informar transferencia";
  const descripcion =
    forma === "EFECTIVO" || esPropietaria
      ? "Al confirmarlo, la cuota queda paga y se emite el comprobante."
      : "Registrá la transferencia que te avisó el alumno.";

  const datosDelFormulario = {
    idInscripcion: inscripcion.id_inscripcion,
    precioVigente: cotizacionActual.monto,
    idPromocion: promocionSeleccionada === "SIN_PROMOCION" ? undefined : Number(promocionSeleccionada),
    monto,
    onMontoChange: setMonto,
    onCancelar: onClose,
  };
  const nombreCompletoAlumno = `${alumno.nombre} ${alumno.apellido}`.trim();

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-border p-0 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        <DialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:bg-white/5">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">{titulo}</DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">{descripcion}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <ResumenCobro alumno={alumno} inscripcion={inscripcionConCotizacion} />
          <SelectorPromocion
            promociones={promociones}
            seleccionada={promocionSeleccionada}
            onChange={setPromocionSeleccionada}
          />
          {!ocultarSelectorForma && (
            <SelectorFormaDeCobro formas={FORMAS} valor={forma} onChange={setForma} leyenda="Tipo Pago" etiquetas={ETIQUETAS} />
          )}

          {cargandoCotizacion ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground dark:bg-white/5">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Calculando promoción y monto vigente...
            </div>
          ) : errorCotizacion ? (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
              No se pudo obtener el monto vigente. Cerrá el formulario y volvé a intentarlo.
            </p>
          ) : forma === "EFECTIVO" ? (
            <FormularioCobroEfectivo {...datosDelFormulario} onExito={onExito} />
          ) : (
            <FormularioTransferenciaCobro
              {...datosDelFormulario}
              titularInicial={nombreCompletoAlumno}
              onExito={onExito}
              onInformada={onTransferenciaInformada ?? onClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
