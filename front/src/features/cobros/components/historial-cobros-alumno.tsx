import { useState } from "react";
import { Receipt } from "lucide-react";
import { useHistorialPagos } from "@/features/cobros/hooks/use-cobros";
import { ModalComprobante } from "@/features/cobros/components/modal-comprobante";
import type { AlumnoDetalle } from "@/features/alumnos/schemas/alumno";
import { formatearPrecio } from "@/utils/moneda";
import { formatearFechaCobro } from "@/features/cobros/utils/formato-cobros";

interface Props {
  alumno: AlumnoDetalle;
}

export function HistorialCobrosAlumno({ alumno }: Props) {
  const { data: pagos = [], isLoading } = useHistorialPagos({
    idAlumno: alumno.id_alumno,
  });

  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Cobros
      </h2>

      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span className="mr-2 size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Cargando cobros…
          </div>
        ) : pagos.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="mx-auto size-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
              No hay cobros registrados todavía
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Al cobrar una cuota se emitirá automáticamente el comprobante digital correspondiente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    N° Recibo
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Forma de pago
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Monto
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {pagos.map((pago) => (
                  <tr
                    key={pago.id_pago}
                    className="transition-colors hover:bg-pink-50/40 dark:hover:bg-slate-800/60"
                  >
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono font-bold text-sm text-slate-900 dark:text-white">
                      #{String(pago.id_pago).padStart(6, "0")}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300">
                      {formatearFechaCobro(pago.fecha_pago)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">
                      {pago.forma_pago === "EFECTIVO" ? "Efectivo" : "Transferencia"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                      {formatearPrecio(pago.monto)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 shadow-2xs dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                          Confirmado
                        </span>
                        {!pago.rendido && pago.forma_pago === "EFECTIVO" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 shadow-2xs dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
                            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                            Pendiente de rendición
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setComprobanteSeleccionado(pago.id_pago)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs transition-colors hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                      >
                        Ver recibo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de comprobante digital */}
      <ModalComprobante
        idPago={comprobanteSeleccionado}
        abierto={Boolean(comprobanteSeleccionado)}
        onClose={() => setComprobanteSeleccionado(null)}
      />
    </div>
  );
}
