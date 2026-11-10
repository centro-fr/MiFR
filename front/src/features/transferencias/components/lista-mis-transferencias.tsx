import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatearPrecio } from "@/utils/moneda";
import { formatearFechaCobro } from "@/features/cobros/utils/formato-cobros";
import type { TransferenciaApi } from "../schemas/transferencia";

interface Props {
  transferencias: TransferenciaApi[];
}

export function ListaMisTransferencias({ transferencias }: Props) {
  if (transferencias.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <h3 className="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
          No tenés pagos registrados
        </h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Cuando el centro registre un cobro en efectivo o una transferencia tuya, va a aparecer en este historial.
        </p>
      </Card>
    );
  }

  function renderBadgeFormaPago(forma: TransferenciaApi["forma_pago"]) {
    if (forma === "EFECTIVO") {
      return (
        <Badge
          variant="secondary"
          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          Efectivo
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-bold text-pink-700 dark:bg-pink-950/60 dark:text-pink-300"
      >
        Transferencia
      </Badge>
    );
  }

  function renderBadgeEstado(item: TransferenciaApi) {
    if (item.forma_pago === "EFECTIVO") {
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 rounded-full border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-3" aria-hidden="true" />
          Cobrado
        </Badge>
      );
    }

    switch (item.estado) {
      case "PENDIENTE":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 rounded-full border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <Clock className="size-3" aria-hidden="true" />
            Pendiente de verificación
          </Badge>
        );
      case "CONFIRMADO":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 rounded-full border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Verificada
          </Badge>
        );
      case "RECHAZADO":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 rounded-full border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <XCircle className="size-3" aria-hidden="true" />
            Rechazada
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-4">
      {/* VISTA MOBILE: Tarjetas individuales */}
      <div className="grid gap-3 sm:hidden">
        {transferencias.map((item) => (
          <Card
            key={item.id_pago}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {formatearFechaCobro(item.fecha_hora_transferencia ?? item.fecha_pago)}
                  </span>
                  {renderBadgeFormaPago(item.forma_pago)}
                </div>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {formatearPrecio(item.monto)}
                </p>
              </div>
              {renderBadgeEstado(item)}
            </div>

            {item.forma_pago === "TRANSFERENCIA" && item.titular_cuenta_origen && (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-500">Titular origen: </span>
                {item.titular_cuenta_origen}
              </p>
            )}

            {item.observaciones && (
              <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                &ldquo;{item.observaciones}&rdquo;
              </p>
            )}

            {item.estado === "RECHAZADO" && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                <div className="flex items-center gap-1 font-bold">
                  <AlertTriangle className="size-3.5" />
                  Motivo del rechazo:
                </div>
                <p className="mt-0.5">{item.motivo_rechazo ?? "No figura en el extracto bancario"}</p>
                <p className="mt-1.5 font-semibold">Consultalo con la administración o con tu profesor/a.</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* VISTA DESKTOP: Tabla estilizada */}
      <Card className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs sm:block dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Fecha
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Medio
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Monto
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Detalle / Titular
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Observaciones
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {transferencias.map((item) => (
                <tr
                  key={item.id_pago}
                  className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                    {formatearFechaCobro(item.fecha_hora_transferencia ?? item.fecha_pago)}
                  </td>
                  <td className="px-5 py-4">
                    {renderBadgeFormaPago(item.forma_pago)}
                  </td>
                  <td className="px-5 py-4 font-black text-slate-900 dark:text-white">
                    {formatearPrecio(item.monto)}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">
                    {item.forma_pago === "EFECTIVO"
                      ? "Cobro en sede"
                      : (item.titular_cuenta_origen ?? "Mismo alumno")}
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                    {item.observaciones ?? "-"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      {renderBadgeEstado(item)}
                      {item.estado === "RECHAZADO" && item.motivo_rechazo && (
                        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                          {item.motivo_rechazo}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
