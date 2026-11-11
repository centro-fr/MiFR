import { Printer, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useComprobante } from "@/features/cobros/hooks/use-cobros";
import { formatearPrecio } from "@/utils/moneda";
import { formatearFechaCobro } from "@/features/cobros/utils/formato-cobros";

interface Props {
  idPago: number | null;
  abierto: boolean;
  onClose: () => void;
}

export function ModalComprobante({ idPago, abierto, onClose }: Props) {
  const { data: comprobante, isLoading, error } = useComprobante(idPago, abierto);

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

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent
        overlayClassName="print:hidden"
        className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-lg dark:border-slate-800 dark:bg-slate-900 print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:bg-white print:p-0 print:static print:transform-none"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
            <DialogTitle className="sr-only">Comprobante de cobro digital</DialogTitle>
            <DialogDescription className="sr-only">
              Cargando información del comprobante emitido.
            </DialogDescription>
            <span className="size-8 animate-spin rounded-full border-2 border-[#BC1266] border-t-transparent" />
            <p className="mt-3 text-sm font-medium">Generando comprobante digital...</p>
          </div>
        ) : error || !comprobante ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-rose-600 dark:text-rose-400">
            <DialogTitle className="sr-only">Comprobante de cobro digital</DialogTitle>
            <DialogDescription className="sr-only">
              Error al cargar el comprobante de cobro digital.
            </DialogDescription>
            <AlertCircle className="size-10" />
            <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
              No se pudo cargar el comprobante
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              El cobro fue registrado correctamente, pero no se pudo obtener la vista del comprobante.
            </p>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="mt-4 min-h-[40px] rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col print:p-0">
            {/* Cabecera (Header) */}
            <DialogHeader className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-6 py-5 text-left dark:border-slate-800 dark:bg-slate-900/50 print:border-b-2 print:border-slate-800 print:bg-transparent print:px-0 print:py-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between pr-8 sm:pr-10">
                <div>
                  <DialogTitle className="text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">
                    CENTRO DE ENTRENAMIENTO FR
                  </DialogTitle>
                  <DialogDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Comprobante de cobro digital
                  </DialogDescription>
                </div>
                <div>
                  <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 print:border-slate-400">
                    N° {String(comprobante.numero).padStart(6, "0")}
                  </span>
                </div>
              </div>
            </DialogHeader>

            {/* Cuerpo (Body) */}
            <div className="flex-1 space-y-4 p-6 print:space-y-4 print:p-0 print:pt-4">
              {/* Monto destacado: único énfasis visual en color de marca */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-center dark:border-slate-800 dark:bg-slate-800/40 print:border print:border-slate-300 print:bg-transparent">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Monto cobrado
                </span>
                <p className="mt-1 text-3xl font-black tracking-tight text-[#BC1266] dark:text-[#E83E8C] tabular-nums print:text-slate-900">
                  {formatearPrecio(comprobante.monto)}
                </p>
              </div>

              {/* Datos de la transacción ordenados y legibles */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50 print:border print:border-slate-300">
                <dl className="grid grid-cols-1 gap-y-3.5 sm:grid-cols-2 sm:gap-x-4 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Alumno</dt>
                    <dd className="mt-0.5 font-bold text-slate-900 dark:text-white">
                      {comprobante.alumno.nombre} {comprobante.alumno.apellido}
                    </dd>
                    {comprobante.alumno.dni && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        DNI: {comprobante.alumno.dni}
                      </p>
                    )}
                  </div>

                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Fecha de cobro</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                      {formatearFechaCobro(comprobante.fecha)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Plan</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                      {comprobante.plan}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Cuota</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                      Cuota N° {comprobante.cuota.numero}
                    </dd>
                  </div>

                  <div className="sm:col-span-2 border-t border-slate-100 pt-3 dark:border-slate-800 print:border-slate-200">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Receptor / Registrado por
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-700 dark:text-slate-300">
                      {comprobante.profesora_cobra
                        ? `Profesora: ${comprobante.profesora_cobra.nombre} ${comprobante.profesora_cobra.apellido}`
                        : `Administración: ${comprobante.registrado_por.nombre} ${comprobante.registrado_por.apellido}`}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Pie (Footer) */}
            <DialogFooter className="shrink-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800 dark:bg-slate-900 print:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="min-h-[44px] rounded-xl border-slate-200 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                <X aria-hidden="true" className="mr-2 size-4" />
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={imprimir}
                className="min-h-[44px] rounded-xl bg-[#BC1266] font-bold text-white shadow-xs hover:bg-[#9D1055] transition-colors dark:bg-pink-700 dark:hover:bg-pink-600"
              >
                <Printer aria-hidden="true" className="mr-2 size-4" />
                Imprimir / Guardar comprobante
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
