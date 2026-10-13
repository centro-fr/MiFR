import { useState } from "react";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatosBancariosCard } from "../components/datos-bancarios-card";
import { ListaMisTransferencias } from "../components/lista-mis-transferencias";
import { ModalInformarTransferencia } from "../components/modal-informar-transferencia";
import { ResumenPlanCuota } from "../components/resumen-plan-cuota";
import { useMiPlan, useMisTransferencias } from "../hooks/use-transferencias";
import type { TransferenciaApi } from "../schemas/transferencia";

export function MiPlanPage() {
  const { data: planData, isLoading: cargandoPlan, isError: errorPlan, refetch: reintentarPlan } = useMiPlan();
  const {
    data: transferencias = [],
    isLoading: cargandoTransferencias,
  } = useMisTransferencias();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [transferenciaAReintentar, setTransferenciaAReintentar] = useState<TransferenciaApi | null>(null);

  function handleAbrirNuevo() {
    setTransferenciaAReintentar(null);
    setModalAbierto(true);
  }

  function handleReintentar(transferencia: TransferenciaApi) {
    setTransferenciaAReintentar(transferencia);
    setModalAbierto(true);
  }

  const cargando = cargandoPlan || cargandoTransferencias;

  if (cargando) {
    return (
      <OwnerLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Cargando los datos de tu plan y transferencias...
          </p>
        </div>
      </OwnerLayout>
    );
  }

  if (errorPlan || !planData) {
    return (
      <OwnerLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertCircle className="size-10 text-rose-500" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            No pudimos cargar la información de tu plan
          </h2>
          <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
            Ocurrió un error al consultar tus datos. Por favor intentá nuevamente.
          </p>
          <Button type="button" onClick={() => reintentarPlan()} className="mt-2 min-h-[44px] rounded-xl bg-primary">
            <RotateCcw className="mr-2 size-4" />
            Reintentar
          </Button>
        </div>
      </OwnerLayout>
    );
  }

  const conteoTransferencias = transferencias.length;
  const montoPlan = planData.situacion_cuota?.monto ?? planData.inscripcion?.precio ?? 0;
  const idInscripcion = planData.inscripcion?.id_inscripcion ?? 0;

  return (
    <OwnerLayout>
      <div className="min-w-0 space-y-6">
        {/* ENCABEZADO PRINCIPAL (Segun crear-nueva-vista skill) */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Mi plan y transferencias
            </h1>
            <Badge
              variant="outline"
              className="shadow-2xs rounded-full border-pink-200 bg-pink-100 px-3 py-1 text-sm font-extrabold text-pink-700 dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300"
            >
              {conteoTransferencias} {conteoTransferencias === 1 ? "pago" : "pagos"}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
            Consultá el estado de tu cuota, los datos bancarios y tu historial de pagos.
          </p>
        </div>

        {/* BLOQUE PRINCIPAL: DETALLE DEL PLAN Y DATOS BANCARIOS */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Izquierda: Resumen del plan y cuota */}
          <ResumenPlanCuota planData={planData} onAbrirModal={handleAbrirNuevo} />

          {/* Derecha: Datos bancarios con copiado rápido */}
          <DatosBancariosCard datos={planData.datos_bancarios} />
        </div>

        {/* SECCIÓN HISTORIAL DE PAGOS */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Historial de pagos
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Registro de tus pagos en efectivo y transferencias bancarias informadas.
              </p>
            </div>
          </div>

          <ListaMisTransferencias
            transferencias={transferencias}
            onReintentar={handleReintentar}
          />
        </div>

        {/* MODAL PARA INFORMAR TRANSFERENCIA */}
        {modalAbierto && (
          <ModalInformarTransferencia
            open={modalAbierto}
            onOpenChange={setModalAbierto}
            idInscripcion={idInscripcion}
            montoSugerido={transferenciaAReintentar ? transferenciaAReintentar.monto : montoPlan}
            nombrePlan={planData.inscripcion?.nombre_plan ?? "Plan"}
          />
        )}
      </div>
    </OwnerLayout>
  );
}
