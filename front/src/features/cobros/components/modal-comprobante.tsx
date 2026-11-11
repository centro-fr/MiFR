import { createPortal } from "react-dom";
import { Printer, X, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogoFr } from "@/components/marca/logo-fr";
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
    <>
      <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
        <DialogContent
          className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
              <DialogTitle className="sr-only">Comprobante Digital</DialogTitle>
              <DialogDescription className="sr-only">
                Cargando información del comprobante emitido.
              </DialogDescription>
              <span className="size-8 animate-spin rounded-full border-2 border-[#BC1266] border-t-transparent" />
              <p className="mt-3 text-sm font-medium">Generando comprobante digital...</p>
            </div>
          ) : error || !comprobante ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-rose-600 dark:text-rose-400">
              <DialogTitle className="sr-only">Comprobante Digital</DialogTitle>
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
            <div className="flex flex-col">
              {/* Header: Logo FR + Comprobante Digital con pr-12 para dar aire a la cruz de cierre */}
              <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <LogoFr className="size-9 shrink-0" />
                  <div>
                    <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      Comprobante Digital
                    </DialogTitle>
                    <p className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      N° {String(comprobante.numero).padStart(6, "0")}
                    </p>
                  </div>
                </div>
                <DialogDescription className="sr-only">
                  Detalle del comprobante de cobro digital emitido.
                </DialogDescription>
              </DialogHeader>

              {/* Body: Detalle en forma de filas dentro de card limpia */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <dl className="divide-y divide-slate-200/70 dark:divide-slate-700/60 text-sm">
                    <div className="flex items-center justify-between py-2.5 first:pt-0">
                      <dt className="text-slate-500 dark:text-slate-400">Alumno</dt>
                      <dd className="font-semibold text-slate-900 dark:text-white text-right">
                        {comprobante.alumno.nombre} {comprobante.alumno.apellido}
                        {comprobante.alumno.dni && (
                          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                            DNI: {comprobante.alumno.dni}
                          </span>
                        )}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500 dark:text-slate-400">Plan</dt>
                      <dd className="font-semibold text-slate-900 dark:text-white text-right">
                        {comprobante.plan}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500 dark:text-slate-400">Cuota</dt>
                      <dd className="font-semibold text-slate-900 dark:text-white text-right">
                        Cuota N° {comprobante.cuota.numero}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500 dark:text-slate-400">Fecha de cobro</dt>
                      <dd className="font-semibold text-slate-900 dark:text-white text-right">
                        {formatearFechaCobro(comprobante.fecha)}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500 dark:text-slate-400">Receptor</dt>
                      <dd className="font-semibold text-slate-900 dark:text-white text-right">
                        {comprobante.profesora_cobra
                          ? `Profesora: ${comprobante.profesora_cobra.nombre} ${comprobante.profesora_cobra.apellido}`
                          : `Administración: ${comprobante.registrado_por.nombre} ${comprobante.registrado_por.apellido}`}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between pt-3 pb-0.5">
                      <dt className="font-bold text-slate-700 dark:text-slate-200">Monto cobrado</dt>
                      <dd className="text-2xl font-black tracking-tight text-[#BC1266] dark:text-[#E83E8C] tabular-nums">
                        {formatearPrecio(comprobante.monto)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Footer: Botones de acción */}
              <DialogFooter className="shrink-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800 dark:bg-slate-900">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="min-h-[42px] rounded-xl border-slate-200 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <X aria-hidden="true" className="mr-2 size-4" />
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={imprimir}
                  className="min-h-[42px] rounded-xl bg-[#BC1266] font-bold text-white shadow-xs hover:bg-[#9D1055] transition-colors dark:bg-pink-700 dark:hover:bg-pink-600"
                >
                  <Printer aria-hidden="true" className="mr-2 size-4" />
                  Imprimir / Guardar comprobante
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Versión para impresión: montada directo en document.body con clase .informe-impresion.
          El CSS de index.css oculta automáticamente todo el resto del sistema (@media print) y muestra solo esta caja limpia. */}
      {abierto && comprobante && typeof document !== "undefined" && createPortal(
        <div className="informe-impresion mx-auto max-w-md bg-white p-6 font-sans text-slate-900 border border-slate-300 rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-300 pb-4">
            <div className="flex items-center gap-3">
              <LogoFr className="size-9 shrink-0" />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Comprobante Digital
                </h1>
                <p className="text-xs font-mono font-medium text-slate-600">
                  N° {String(comprobante.numero).padStart(6, "0")}
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200 py-3 text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Alumno</span>
              <span className="font-semibold text-slate-900 text-right">
                {comprobante.alumno.nombre} {comprobante.alumno.apellido}
                {comprobante.alumno.dni && (
                  <span className="block text-xs font-normal text-slate-600">
                    DNI: {comprobante.alumno.dni}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Plan</span>
              <span className="font-semibold text-slate-900 text-right">{comprobante.plan}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Cuota</span>
              <span className="font-semibold text-slate-900 text-right">Cuota N° {comprobante.cuota.numero}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Fecha de cobro</span>
              <span className="font-semibold text-slate-900 text-right">{formatearFechaCobro(comprobante.fecha)}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Receptor</span>
              <span className="font-semibold text-slate-900 text-right">
                {comprobante.profesora_cobra
                  ? `Profesora: ${comprobante.profesora_cobra.nombre} ${comprobante.profesora_cobra.apellido}`
                  : `Administración: ${comprobante.registrado_por.nombre} ${comprobante.registrado_por.apellido}`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 pb-1">
              <span className="font-bold text-slate-800">Monto cobrado</span>
              <span className="text-2xl font-black text-[#BC1266] tabular-nums">
                {formatearPrecio(comprobante.monto)}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
            Centro de Entrenamiento FR · Comprobante emitido digitalmente
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
