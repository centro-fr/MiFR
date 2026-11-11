import { createPortal } from "react-dom";
import { Printer, X, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
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
          className="max-w-md rounded-2xl border-slate-200 bg-white p-6 shadow-xl sm:max-w-lg dark:border-slate-800 dark:bg-slate-900"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <DialogTitle className="sr-only">Comprobante Digital</DialogTitle>
              <DialogDescription className="sr-only">
                Cargando información del comprobante emitido.
              </DialogDescription>
              <span className="size-8 animate-spin rounded-full border-2 border-[#BC1266] border-t-transparent" />
              <p className="mt-3 text-sm font-medium">Generando comprobante digital...</p>
            </div>
          ) : error || !comprobante ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-rose-600 dark:text-rose-400">
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
              {/* Cabecera: Logo FR + Comprobante Digital */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <LogoFr className="size-8" />
                  <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Comprobante Digital
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Detalle del comprobante de cobro digital emitido.
                  </DialogDescription>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                  N° {String(comprobante.numero).padStart(6, "0")}
                </span>
              </div>

              {/* Cuerpo: Detalle en forma de filas */}
              <div className="divide-y divide-slate-100 py-2 text-sm dark:divide-slate-800">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Alumno</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {comprobante.alumno.nombre} {comprobante.alumno.apellido}
                    {comprobante.alumno.dni && (
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        {" · DNI: "}{comprobante.alumno.dni}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Plan</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{comprobante.plan}</span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Cuota</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Cuota N° {comprobante.cuota.numero}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Fecha de cobro</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatearFechaCobro(comprobante.fecha)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">Receptor</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {comprobante.profesora_cobra
                      ? `Profesora: ${comprobante.profesora_cobra.nombre} ${comprobante.profesora_cobra.apellido}`
                      : `Administración: ${comprobante.registrado_por.nombre} ${comprobante.registrado_por.apellido}`}
                  </span>
                </div>

                {/* Monto cobrado como fila final destacada con color sobrio de marca */}
                <div className="flex items-center justify-between pt-3 pb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Monto cobrado</span>
                  <span className="text-2xl font-black tracking-tight text-[#BC1266] dark:text-[#E83E8C] tabular-nums">
                    {formatearPrecio(comprobante.monto)}
                  </span>
                </div>
              </div>

              {/* Pie: Botones de acción */}
              <DialogFooter className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800">
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

      {/* Versión para impresión: Portal montado directo en document.body con clase .informe-impresion.
          index.css oculta automáticamente todo el resto del sistema (@media print) y muestra solo esta caja limpia. */}
      {abierto && comprobante && typeof document !== "undefined" && createPortal(
        <div className="informe-impresion mx-auto max-w-md bg-white p-6 font-sans text-slate-900 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <LogoFr className="size-8" />
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Comprobante Digital
              </h1>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-600">
              N° {String(comprobante.numero).padStart(6, "0")}
            </span>
          </div>

          <div className="divide-y divide-slate-100 py-3 text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">Alumno</span>
              <span className="font-semibold text-slate-900">
                {comprobante.alumno.nombre} {comprobante.alumno.apellido}
                {comprobante.alumno.dni && ` · DNI: ${comprobante.alumno.dni}`}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">Plan</span>
              <span className="font-semibold text-slate-900">{comprobante.plan}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">Cuota</span>
              <span className="font-semibold text-slate-900">Cuota N° {comprobante.cuota.numero}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">Fecha de cobro</span>
              <span className="font-semibold text-slate-900">{formatearFechaCobro(comprobante.fecha)}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">Receptor</span>
              <span className="font-medium text-slate-900">
                {comprobante.profesora_cobra
                  ? `Profesora: ${comprobante.profesora_cobra.nombre} ${comprobante.profesora_cobra.apellido}`
                  : `Administración: ${comprobante.registrado_por.nombre} ${comprobante.registrado_por.apellido}`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 pb-1">
              <span className="font-medium text-slate-700">Monto cobrado</span>
              <span className="text-2xl font-black text-[#BC1266] tabular-nums">
                {formatearPrecio(comprobante.monto)}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
            Centro de Entrenamiento FR · Comprobante emitido digitalmente
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
