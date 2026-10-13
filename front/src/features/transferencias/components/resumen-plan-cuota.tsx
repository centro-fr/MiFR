import { AlertCircle, Calendar, CheckCircle2, Clock, Dumbbell, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatearPrecio } from "@/utils/moneda";
import { formatearFechaCobro } from "@/features/cobros/utils/formato-cobros";
import type { MiPlanRespuesta } from "../schemas/transferencia";

interface Props {
  planData: MiPlanRespuesta;
  onAbrirModal: () => void;
}

export function ResumenPlanCuota({ planData, onAbrirModal }: Props) {
  const { inscripcion, situacion_cuota } = planData;

  const tieneTransferenciaPendiente = situacion_cuota?.tiene_transferencia_pendiente ?? false;
  const transferenciaPendiente = situacion_cuota?.transferencia_pendiente;

  // Badge y colores según situación de cuota (US-18)
  const estadoCuota = situacion_cuota?.estado ?? "AL_DIA";
  const estadoConfig = {
    AL_DIA: {
      etiqueta: "Cuota al día",
      clase: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
      icono: CheckCircle2,
    },
    EN_GRACIA: {
      etiqueta: "Período de gracia",
      clase: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
      icono: Clock,
    },
    VENCIDA: {
      etiqueta: "Cuota vencida",
      clase: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
      icono: AlertCircle,
    },
  }[estadoCuota];

  const IconoEstado = estadoConfig.icono;

  return (
    <div className="space-y-4">
      {/* Alerta destacada si tiene una transferencia pendiente de verificación */}
      {tieneTransferenciaPendiente && transferenciaPendiente && (
        <aside
          role="status"
          aria-label="Aviso de transferencia pendiente de verificación"
          className="flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
            <Clock className="size-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 text-sm leading-relaxed">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-amber-950 dark:text-amber-100">
                Aviso de transferencia en verificación
              </span>
              <Badge
                variant="outline"
                className="rounded-full border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
              >
                {formatearPrecio(transferenciaPendiente.monto)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
              Informaste una transferencia bancaria el{" "}
              <strong>
                {formatearFechaCobro(transferenciaPendiente.fecha_hora_transferencia ?? transferenciaPendiente.fecha_pago)}
              </strong>
              . La propietaria la verificará en el extracto bancario.{" "}
              <strong className="text-amber-950 dark:text-amber-100">
                Podés continuar asistiendo a clases normalmente mientras tanto.
              </strong>
            </p>
          </div>
        </aside>
      )}

      {/* Tarjeta de estado de cuota y plan */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Plan activo
              </span>
              <Badge
                variant="outline"
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${estadoConfig.clase}`}
              >
                <IconoEstado className="size-3.5" aria-hidden="true" />
                {estadoConfig.etiqueta}
              </Badge>
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              {inscripcion?.nombre_plan ?? "Sin plan asignado"}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
              {inscripcion?.clases_por_semana && (
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="size-3.5 text-slate-400" aria-hidden="true" />
                  {inscripcion.clases_por_semana} clases semanales
                </span>
              )}
              {inscripcion?.nombre_profesora && (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-slate-400" aria-hidden="true" />
                  Profesora: {inscripcion.nombre_profesora}
                </span>
              )}
              {situacion_cuota?.fecha_vencimiento && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-400" aria-hidden="true" />
                  Vencimiento: {formatearFechaCobro(situacion_cuota.fecha_vencimiento)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Importe de la cuota
              </span>
              <p className="text-2xl font-black text-pink-700 dark:text-pink-400">
                {formatearPrecio(situacion_cuota?.monto ?? inscripcion?.precio ?? 0)}
              </p>
            </div>

            <Button
              type="button"
              onClick={onAbrirModal}
              className="mt-1 min-h-[44px] rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-md shadow-primary/20 transition-transform hover:bg-primary-dark active:scale-95"
            >
              + Informar transferencia
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
