import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { DatosBancariosCard } from "../components/datos-bancarios-card";
import { ListaMisTransferencias } from "../components/lista-mis-transferencias";
import { ResumenPlanCuota } from "../components/resumen-plan-cuota";
import { useMiPlan, useMisTransferencias } from "../hooks/use-transferencias";

export function MiPlanPage() {
  const { data: planData, isLoading: cargandoPlan, isError: errorPlan, refetch: reintentarPlan } = useMiPlan();
  const {
    data: transferencias = [],
    isLoading: cargandoTransferencias,
  } = useMisTransferencias();

  const cargando = cargandoPlan || cargandoTransferencias;

  if (cargando) {
    return (
      <OwnerLayout>
        <div aria-busy="true" aria-label="Cargando datos de tu plan y transferencias" className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
          <Skeleton className="h-56 rounded-3xl" />
        </div>
      </OwnerLayout>
    );
  }

  if (errorPlan || !planData) {
    return (
      <OwnerLayout>
        <div className="py-8">
          <EstadoErrorCarga
            titulo="No pudimos cargar la información de tu plan"
            mensaje="Ocurrió un error al consultar tus datos. Por favor intentá nuevamente."
            onReintentar={() => reintentarPlan()}
          />
        </div>
      </OwnerLayout>
    );
  }

  const conteoTransferencias = transferencias.length;

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
          <ResumenPlanCuota planData={planData} />

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
                Los cobros en efectivo y las transferencias que registró el centro.
              </p>
            </div>
          </div>

          <ListaMisTransferencias transferencias={transferencias} />
        </div>
      </div>
    </OwnerLayout>
  );
}
