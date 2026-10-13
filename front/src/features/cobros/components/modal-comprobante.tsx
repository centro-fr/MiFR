import { Printer, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    window.print();
  }

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border-slate-200 bg-white p-6 shadow-xl sm:max-w-lg dark:border-slate-700 dark:bg-slate-900">
        <DialogTitle className="sr-only">Comprobante de cobro digital</DialogTitle>
        <DialogDescription className="sr-only">
          Detalle del comprobante emitido por el cobro en efectivo.
        </DialogDescription>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <span className="size-8 animate-spin rounded-full border-2 border-[#BC1266] border-t-transparent" />
            <p className="mt-3 text-sm font-medium">Generando comprobante digital...</p>
          </div>
        ) : error || !comprobante ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-10" />
            <p className="mt-2 text-base font-bold">No se pudo cargar el comprobante</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El cobro fue registrado correctamente, pero no se pudo obtener la vista del comprobante.
            </p>
            <Button type="button" onClick={onClose} variant="outline" className="mt-4">
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="print:p-0">
            {/* Cabecera del comprobante */}
            <div className="border-b border-dashed border-slate-200 pb-5 text-center dark:border-slate-700">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
                <CheckCircle2 className="size-7" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-[#181C26] dark:text-white">
                CENTRO DE ENTRENAMIENTO FR
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#BC1266] dark:text-pink-300">
                Comprobante de Cobro Digital
              </p>
              <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                N° {String(comprobante.numero).padStart(6, "0")}
              </p>
            </div>

            {/* Monto destacado */}
            <div className="my-5 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Monto cobrado
              </span>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {formatearPrecio(comprobante.monto)}
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  Cobro en efectivo confirmado
                </Badge>
                {comprobante.profesora_cobra && (
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  >
                    Pendiente de rendición
                  </Badge>
                )}
              </div>
            </div>

            {/* Datos de la transacción */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Alumno</dt>
                <dd className="font-bold text-[#181C26] dark:text-white">
                  {comprobante.alumno.nombre} {comprobante.alumno.apellido}
                </dd>
                {comprobante.alumno.dni && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    DNI: {comprobante.alumno.dni}
                  </span>
                )}
              </div>

              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Fecha de cobro</dt>
                <dd className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatearFechaCobro(comprobante.fecha)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Plan</dt>
                <dd className="font-semibold text-slate-800 dark:text-slate-200">{comprobante.plan}</dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Cuota</dt>
                <dd className="font-semibold text-slate-800 dark:text-slate-200">
                  Cuota N° {comprobante.cuota.numero}
                </dd>
              </div>

              <div className="col-span-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Receptor del cobro</dt>
                <dd className="font-medium text-slate-700 dark:text-slate-300">
                  {comprobante.profesora_cobra
                    ? `Profesora: ${comprobante.profesora_cobra.nombre} ${comprobante.profesora_cobra.apellido}`
                    : `Administración: ${comprobante.registrado_por.nombre} ${comprobante.registrado_por.apellido}`}
                </dd>
              </div>
            </dl>

            {/* Acciones */}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end print:hidden">
              <Button type="button" variant="outline" onClick={onClose} className="min-h-[44px]">
                <X aria-hidden="true" className="mr-2 size-4" />
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={imprimir}
                className="min-h-[44px] bg-[#BC1266] font-bold text-white hover:bg-[#9D1055] dark:bg-pink-700 dark:hover:bg-pink-600"
              >
                <Printer aria-hidden="true" className="mr-2 size-4" />
                Imprimir / Guardar comprobante
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
