import { useState } from "react";
import { Banknote, FileText, Receipt, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { useHistorialPagos } from "@/features/cobros/hooks/use-cobros";
import { ModalCobroEfectivo } from "@/features/cobros/components/modal-cobro-efectivo";
import { ModalComprobante } from "@/features/cobros/components/modal-comprobante";
import type { AlumnoDetalle } from "@/features/alumnos/schemas/alumno";
import { formatearPrecio } from "@/utils/moneda";
import { formatearFechaCobro } from "@/features/cobros/utils/formato-cobros";

interface Props {
  alumno: AlumnoDetalle;
}

export function HistorialCobrosAlumno({ alumno }: Props) {
  const { hasPermission } = usePermissions();
  const puedeRegistrarCobro = hasPermission("PAGOS_REGISTRAR") && alumno.estado !== "BAJA";

  const inscripcionVigente =
    alumno.inscripcion && (alumno.inscripcion.estado === "ACTIVA" || alumno.inscripcion.estado === "PREINSCRIPTA")
      ? alumno.inscripcion
      : null;

  const { data: pagos = [], isLoading } = useHistorialPagos({
    idAlumno: alumno.id_alumno,
  });

  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<number | null>(null);

  function abrirCobro() {
    setModalCobroAbierto(true);
  }

  function handleCobroExitoso(idPago: number) {
    setModalCobroAbierto(false);
    setComprobanteSeleccionado(idPago);
  }

  return (
    <>
      <Card className="rounded-xl border-slate-200 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-850">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-[#181C26] dark:text-white">
              <Receipt aria-hidden="true" className="size-5 text-[#BC1266] dark:text-pink-400" />
              Historial de cobros y comprobantes
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Registro de cuotas abonadas y comprobantes digitales emitidos (US-15).
            </p>
          </div>

          {puedeRegistrarCobro && inscripcionVigente && (
            <Button
              type="button"
              onClick={abrirCobro}
              className="min-h-[44px] bg-[#BC1266] font-bold text-white hover:bg-[#9D1055] dark:bg-pink-700 dark:hover:bg-pink-600"
            >
              <Banknote aria-hidden="true" className="mr-2 size-4" />
              Registrar cobro en efectivo
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <span className="size-6 animate-spin rounded-full border-2 border-[#BC1266] border-t-transparent" />
            <span className="ml-2 text-sm font-medium">Cargando cobros...</span>
          </div>
        ) : pagos.length === 0 ? (
          <div className="my-6 rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
            <Receipt className="mx-auto size-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              No hay cobros registrados todavía
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Al cobrar una cuota en efectivo se emitirá automáticamente el comprobante digital correspondiente.
            </p>
            {puedeRegistrarCobro && inscripcionVigente && (
              <Button type="button" onClick={abrirCobro} variant="outline" className="mt-4 min-h-[40px]">
                <Banknote className="mr-2 size-4 text-[#BC1266]" />
                Registrar primer cobro en efectivo
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <tr>
                  <th className="px-3.5 py-2.5">N° Recibo</th>
                  <th className="px-3.5 py-2.5">Fecha</th>
                  <th className="px-3.5 py-2.5">Forma</th>
                  <th className="px-3.5 py-2.5">Monto</th>
                  <th className="px-3.5 py-2.5">Estado</th>
                  <th className="px-3.5 py-2.5 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagos.map((pago) => (
                  <tr key={pago.id_pago} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      #{String(pago.id_pago).padStart(6, "0")}
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300">
                      {formatearFechaCobro(pago.fecha_pago)}
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                        {pago.forma_pago === "EFECTIVO" ? (
                          <>
                            <Banknote className="size-3.5 text-emerald-600" />
                            Efectivo
                          </>
                        ) : (
                          "Transferencia"
                        )}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-bold text-slate-900 dark:text-white">
                      {formatearPrecio(pago.monto)}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        >
                          <CheckCircle className="mr-1 size-3" />
                          Confirmado
                        </Badge>
                        {!pago.rendido && pago.forma_pago === "EFECTIVO" && (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          >
                            <Clock className="mr-1 size-3" />
                            Pendiente de rendición
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setComprobanteSeleccionado(pago.id_pago)}
                        className="min-h-[36px] text-xs font-semibold text-[#BC1266] hover:bg-pink-50 hover:text-[#9D1055] dark:text-pink-300 dark:hover:bg-pink-950/40"
                      >
                        <FileText className="mr-1.5 size-3.5" />
                        Ver recibo
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de cobro en efectivo */}
      {inscripcionVigente && (
        <ModalCobroEfectivo
          abierto={modalCobroAbierto}
          onClose={() => setModalCobroAbierto(false)}
          alumno={{
            id_alumno: alumno.id_alumno,
            nombre: alumno.usuario.nombre,
            apellido: alumno.usuario.apellido,
            dni: alumno.usuario.dni,
          }}
          inscripcion={{
            id_inscripcion: inscripcionVigente.id_inscripcion,
            nombre_plan: inscripcionVigente.plan.nombre,
            precio_vigente: inscripcionVigente.plan.precio,
            situacion_cuota: inscripcionVigente.situacion_cuota,
          }}
          onExito={handleCobroExitoso}
        />
      )}

      {/* Modal de comprobante digital */}
      <ModalComprobante
        idPago={comprobanteSeleccionado}
        abierto={Boolean(comprobanteSeleccionado)}
        onClose={() => setComprobanteSeleccionado(null)}
      />
    </>
  );
}
