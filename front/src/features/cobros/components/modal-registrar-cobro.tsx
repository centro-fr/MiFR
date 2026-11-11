import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { FilaDeDetalle, FilaDeTotal, ListaDeDetalle } from "@/components/detalle/lista-de-detalle";
import { Dialog } from "@/components/ui/dialog";
import {
  BotonModalSecundario,
  ModalCabecera,
  ModalContenido,
  ModalCuerpo,
  ModalPie,
  ModalSeccion,
} from "@/components/ui/estructura-modal";
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
import { usePromociones } from "@/features/promociones/hooks/use-promociones";

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
    <ModalSeccion titulo="Detalle cobro">
      <ListaDeDetalle>
        <FilaDeDetalle etiqueta="Alumno">
          {alumno.nombre} {alumno.apellido}
        </FilaDeDetalle>
        <FilaDeDetalle etiqueta="Plan">{inscripcion.nombre_plan}</FilaDeDetalle>
        {inscripcion.situacion_cuota && (
          <FilaDeDetalle etiqueta="Cuota">{TEXTO_ESTADO_CUOTA[inscripcion.situacion_cuota.estado]}</FilaDeDetalle>
        )}
        <FilaDeDetalle etiqueta="Precio de lista">{formatearPrecio(precioLista)}</FilaDeDetalle>
        {cotizacion && cotizacion.descuento > 0 && (
          <FilaDeDetalle etiqueta="Descuento">
            {cotizacion.promocion?.nombre ?? "Descuento"} · −{formatearPrecio(cotizacion.descuento)}
          </FilaDeDetalle>
        )}
        <FilaDeTotal etiqueta="Total a cobrar">{formatearPrecio(monto)}</FilaDeTotal>
      </ListaDeDetalle>
    </ModalSeccion>
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
  promociones: promocionesProp,
  formaInicial = "EFECTIVO",
  ocultarSelectorForma = false,
  onExito,
  onTransferenciaInformada,
}: Props) {
  const { hasRole } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
  const { data: promocionesQuery = [] } = usePromociones();
  const promocionesBase = promocionesProp && promocionesProp.length > 0 ? promocionesProp : promocionesQuery;
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

  const idPlan = inscripcion.id_plan;
  const promocionesDisponibles = useMemo(() => {
    return promocionesBase.filter((promocion) => {
      if (promocionSeleccionada !== "SIN_PROMOCION" && String(promocion.id) === String(promocionSeleccionada)) {
        return true;
      }
      if (!promocion.activo || promocion.estado !== "ACTIVA") return false;
      if (!idPlan) return true;
      if (!promocion.planes || promocion.planes.length === 0) return true;
      return promocion.planes.some((plan) => plan.id === String(idPlan));
    });
  }, [promocionesBase, idPlan, promocionSeleccionada]);

  const cotizacionActual = calcularCotizacionCobro(
    {
      id: inscripcion.id_inscripcion,
      precioLista: inscripcion.precio_vigente,
      idPromocion: promocionSeleccionada === "SIN_PROMOCION" ? null : Number(promocionSeleccionada),
      idPlan: inscripcion.id_plan ?? 0,
    },
    promocionesBase,
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

  const encabezado = (
    <>
      <ResumenCobro alumno={alumno} inscripcion={inscripcionConCotizacion} />
      <SelectorPromocion
        promociones={promocionesDisponibles}
        seleccionada={promocionSeleccionada}
        onChange={setPromocionSeleccionada}
      />
      {!ocultarSelectorForma && (
        <SelectorFormaDeCobro formas={FORMAS} valor={forma} onChange={setForma} leyenda="Forma de cobro" etiquetas={ETIQUETAS} />
      )}
    </>
  );

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <ModalContenido>
        <ModalCabecera titulo={titulo} descripcion={descripcion} />
        {cargandoCotizacion || errorCotizacion ? (
          <>
            <ModalCuerpo>
              {encabezado}
              {cargandoCotizacion ? (
                <p role="status" className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground dark:bg-slate-800/40">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Calculando promoción y monto vigente...
                </p>
              ) : (
                <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
                  No se pudo obtener el monto vigente. Cerrá el formulario y volvé a intentarlo.
                </p>
              )}
            </ModalCuerpo>
            <ModalPie>
              <BotonModalSecundario onClick={onClose}>Cerrar</BotonModalSecundario>
            </ModalPie>
          </>
        ) : forma === "EFECTIVO" ? (
          <FormularioCobroEfectivo {...datosDelFormulario} encabezado={encabezado} onExito={onExito} />
        ) : (
          <FormularioTransferenciaCobro
            {...datosDelFormulario}
            encabezado={encabezado}
            titularInicial={nombreCompletoAlumno}
            onExito={onExito}
            onInformada={onTransferenciaInformada ?? onClose}
          />
        )}
      </ModalContenido>
    </Dialog>
  );
}
