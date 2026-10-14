import { useState } from "react";
import { ArrowLeftRight, Banknote } from "lucide-react";
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

export interface DatosAlumnoCobro {
  id_alumno: number;
  nombre: string;
  apellido: string;
  dni: string | null;
}

export interface DatosInscripcionCobro {
  id_inscripcion: number;
  nombre_plan: string;
  precio_vigente: number;
  situacion_cuota?: SituacionCuota | null;
}

interface Props {
  abierto: boolean;
  onClose: () => void;
  alumno: DatosAlumnoCobro;
  inscripcion: DatosInscripcionCobro;
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
      <dt className="text-muted-foreground">Precio vigente</dt>
      <dd className="text-right font-bold">{formatearPrecio(inscripcion.precio_vigente)}</dd>
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

/**
 * Cobro de la cuota desde Estado de cuotas (US-15) o Cobros de la profesora: en efectivo o por
 * transferencia, con el mismo diseño que "Confirmar alta". Cada forma tiene su propio formulario.
 */
export function ModalRegistrarCobro({ abierto, onClose, alumno, inscripcion, onExito, onTransferenciaInformada }: Props) {
  const [forma, setForma] = useState<FormaDeCobro>("EFECTIVO");
  const [monto, setMonto] = useState(String(inscripcion.precio_vigente));
  const { titulo, descripcion, Icono } = ENCABEZADO[forma];
  const datosDelFormulario = {
    idInscripcion: inscripcion.id_inscripcion,
    precioVigente: inscripcion.precio_vigente,
    monto,
    onMontoChange: setMonto,
    onCancelar: onClose,
  };

  return (
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

          <ResumenCobro alumno={alumno} inscripcion={inscripcion} />
          <SelectorFormaDeCobro formas={FORMAS} valor={forma} onChange={setForma} leyenda="¿Cómo abonó la cuota?" etiquetas={ETIQUETAS} />

          {forma === "EFECTIVO" ? (
            <FormularioCobroEfectivo {...datosDelFormulario} onExito={onExito} />
          ) : (
            <FormularioTransferenciaCobro {...datosDelFormulario} onInformada={onTransferenciaInformada ?? onClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
