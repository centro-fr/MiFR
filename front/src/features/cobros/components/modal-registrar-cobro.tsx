import { useEffect, useState } from "react";
import { ArrowLeftRight, Banknote, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
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
  /** Cobro en efectivo registrado: con el id del pago, para mostrar su comprobante. */
  onExito: (idPago: number) => void;
  /** Transferencia informada: queda pendiente de verificación, no tiene comprobante todavía. */
  onTransferenciaInformada?: () => void;
}

// La propietaria y la profesora cobran de las dos formas (decisión de la dueña): el efectivo queda
// confirmado en el acto y la transferencia, pendiente hasta verificarla en el extracto.
const FORMAS: FormaDeCobro[] = ["EFECTIVO", "TRANSFERENCIA"];

const ETIQUETAS: EtiquetasFormaDeCobro = {
  EFECTIVO: { titulo: "Efectivo", detalle: "Lo cobraste en el centro." },
  TRANSFERENCIA: { titulo: "Transferencia", detalle: "Queda pendiente hasta verificarla en el extracto." },
};

const ENCABEZADO: Record<FormaDeCobro, { titulo: string; descripcion: string; Icono: typeof Banknote }> = {
  EFECTIVO: {
    titulo: "Registrar cobro en efectivo",
    descripcion: "Al confirmarlo, la cuota queda paga y se emite el comprobante.",
    Icono: Banknote,
  },
  TRANSFERENCIA: {
    titulo: "Informar transferencia",
    descripcion: "Registrá la transferencia que te avisó el alumno.",
    Icono: ArrowLeftRight,
  },
};

function ResumenCobro({ alumno, inscripcion }: Pick<Props, "alumno" | "inscripcion">) {
  const cotizacion = inscripcion.cotizacion;
  const precioLista = cotizacion?.precio_lista ?? inscripcion.precio_vigente;
  const monto = cotizacion?.monto ?? inscripcion.precio_vigente;
  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
      <dt className="text-muted-foreground">Alumno</dt>
      <dd className="text-right font-bold">
        {alumno.nombre} {alumno.apellido}
        <span className="block text-xs font-normal text-muted-foreground">
          {alumno.dni ? `DNI ${alumno.dni}` : "Sin DNI"} · ALU-{String(alumno.id_alumno).padStart(3, "0")}
        </span>
      </dd>
      <dt className="text-muted-foreground">Plan</dt>
      <dd className="text-right font-bold">{inscripcion.nombre_plan}</dd>
      <dt className="text-muted-foreground">Precio de lista</dt>
      <dd className="text-right font-bold">{formatearPrecio(precioLista)}</dd>
      {cotizacion && cotizacion.descuento > 0 && (
        <>
          <dt className="text-muted-foreground">Promoción</dt>
          <dd className="text-right font-semibold text-emerald-700 dark:text-emerald-300">
            {cotizacion.promocion?.nombre ?? "Descuento"} · −{formatearPrecio(cotizacion.descuento)}
          </dd>
        </>
      )}
      <dt className="text-muted-foreground">Total a cobrar</dt>
      <dd className="text-right text-lg font-extrabold text-primary">{formatearPrecio(monto)}</dd>
      {inscripcion.situacion_cuota && (
        <>
          <dt className="text-muted-foreground">Cuota</dt>
          <dd className="flex justify-end">
            <BadgeSituacionCuota situacion={inscripcion.situacion_cuota} />
          </dd>
        </>
      )}
    </dl>
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
        Promoción
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
      {promociones.length === 0 && (
        <p className="text-xs text-muted-foreground">No hay promociones activas para este plan.</p>
      )}
    </div>
  );
}

/**
 * Cobro de la cuota desde Estado de cuotas (US-15) o Cobros de la profesora: en efectivo o por
 * transferencia, con el mismo diseño que "Confirmar alta". Cada forma tiene su propio formulario.
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
  onExito,
  onTransferenciaInformada,
}: Props) {
  const [forma, setForma] = useState<FormaDeCobro>("EFECTIVO");
  const [monto, setMonto] = useState(String(inscripcion.precio_vigente));
  const [promocionSeleccionada, setPromocionSeleccionada] = useState("SIN_PROMOCION");
  useEffect(() => {
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
  useEffect(() => {
    setMonto(String(cotizacionActual.monto));
  }, [cotizacionActual.monto]);

  const inscripcionConCotizacion = { ...inscripcion, cotizacion: cotizacionActual };
  const { titulo, descripcion, Icono } = ENCABEZADO[forma];
  const datosDelFormulario = {
    idInscripcion: inscripcion.id_inscripcion,
    precioVigente: cotizacionActual.monto,
    idPromocion: promocionSeleccionada === "SIN_PROMOCION" ? undefined : Number(promocionSeleccionada),
    monto,
    onMontoChange: setMonto,
    onCancelar: onClose,
  };

  return (
    <>
      <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl border-border p-6 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-pink-50 text-primary dark:bg-primary/15 dark:text-pink-300"
            >
              <Icono className="size-5" />
            </span>
            <DialogTitle className="text-base font-extrabold text-dark dark:text-white">{titulo}</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">{descripcion}</DialogDescription>
          </div>

          <ResumenCobro alumno={alumno} inscripcion={inscripcionConCotizacion} />
          <SelectorPromocion
            promociones={promociones}
            seleccionada={promocionSeleccionada}
            onChange={setPromocionSeleccionada}
          />
          <SelectorFormaDeCobro formas={FORMAS} valor={forma} onChange={setForma} leyenda="¿Cómo abonó la cuota?" etiquetas={ETIQUETAS} />

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
              <FormularioTransferenciaCobro {...datosDelFormulario} onInformada={onTransferenciaInformada ?? onClose} />
            )}
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
