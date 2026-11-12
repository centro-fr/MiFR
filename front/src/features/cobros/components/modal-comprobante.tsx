import { createPortal } from "react-dom";
import { AlertCircle, Printer } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import {
  BotonModalPrincipal,
  BotonModalSecundario,
  ModalCabecera,
  ModalContenido,
  ModalCuerpo,
  ModalPie,
} from "@/components/ui/estructura-modal";
import type { ComprobantePago } from "@/features/cobros/schemas/cobro-efectivo.schema";
import { useComprobante } from "@/features/cobros/hooks/use-cobros";
import { textoNumeroDeComprobante } from "@/features/cobros/utils/formato-cobros";
import { FilasComprobante, MontoComprobante } from "./detalle-comprobante";

interface Props {
  idPago: number | null;
  abierto: boolean;
  onClose: () => void;
}

const TITULO = "Comprobante de cobro";

// El nombre del archivo al guardar como PDF sale del título de la pestaña.
function imprimir() {
  const tituloOriginal = document.title;
  document.title = "Centro de Entrenamiento FR";
  window.addEventListener(
    "afterprint",
    () => {
      document.title = tituloOriginal;
    },
    { once: true },
  );
  window.print();
}

function Cargando() {
  return (
    <>
      <ModalCabecera titulo={TITULO} descripcion="Cargando información del comprobante emitido." />
      <ModalCuerpo className="items-center py-10 text-slate-500 dark:text-slate-400">
        <span aria-hidden="true" className="size-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        <p role="status" className="text-sm font-medium">
          Generando comprobante digital...
        </p>
      </ModalCuerpo>
    </>
  );
}

function ErrorAlCargar({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalCabecera titulo={TITULO} descripcion="No se pudo cargar el comprobante" />
      <ModalCuerpo className="items-center text-center">
        <AlertCircle aria-hidden="true" className="size-8 text-slate-400" />
        <p role="alert" className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
          El cobro fue registrado correctamente, pero no se pudo obtener la vista del comprobante.
        </p>
      </ModalCuerpo>
      <ModalPie>
        <BotonModalSecundario onClick={onClose}>Cerrar</BotonModalSecundario>
      </ModalPie>
    </>
  );
}

function Comprobante({ comprobante, onClose }: { comprobante: ComprobantePago; onClose: () => void }) {
  return (
    <>
      <ModalCabecera
        titulo={TITULO}
        descripcion={`${textoNumeroDeComprobante(comprobante.numero)} · Centro de Entrenamiento FR`}
      />
      <ModalCuerpo className="gap-1">
        <MontoComprobante comprobante={comprobante} />
        <FilasComprobante comprobante={comprobante} />
      </ModalCuerpo>
      <ModalPie>
        <BotonModalSecundario onClick={onClose}>Cerrar</BotonModalSecundario>
        <BotonModalPrincipal onClick={imprimir}>
          <Printer aria-hidden="true" className="size-4" />
          Imprimir o guardar
        </BotonModalPrincipal>
      </ModalPie>
    </>
  );
}

// Versión para imprimir: va directo en <body> con la clase .informe-impresion; el CSS de impresión
// (index.css) oculta el resto del sistema y deja solo este ticket.
function ComprobanteImprimible({ comprobante }: { comprobante: ComprobantePago }) {
  return createPortal(
    <div className="informe-impresion mx-auto max-w-md bg-white p-6 font-sans text-slate-900">
      <header className="border-b border-slate-300 pb-4">
        <h1 className="text-lg font-bold text-slate-900">{TITULO}</h1>
        <p className="text-sm text-slate-500">
          {textoNumeroDeComprobante(comprobante.numero)} · Centro de Entrenamiento FR
        </p>
      </header>
      <div className="flex flex-col gap-1 pt-5">
        <MontoComprobante comprobante={comprobante} />
        <FilasComprobante comprobante={comprobante} />
      </div>
      <p className="mt-6 border-t border-slate-300 pt-3 text-center text-xs text-slate-500">Comprobante emitido digitalmente</p>
    </div>,
    document.body,
  );
}

export function ModalComprobante({ idPago, abierto, onClose }: Props) {
  const { data: comprobante, isLoading, error } = useComprobante(idPago, abierto);

  return (
    <>
      <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
        <ModalContenido ancho="md">
          {isLoading ? (
            <Cargando />
          ) : error || !comprobante ? (
            <ErrorAlCargar onClose={onClose} />
          ) : (
            <Comprobante comprobante={comprobante} onClose={onClose} />
          )}
        </ModalContenido>
      </Dialog>

      {abierto && comprobante && <ComprobanteImprimible comprobante={comprobante} />}
    </>
  );
}
