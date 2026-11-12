import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EditarPlanDialog } from "@/features/planes/components/editar-plan-dialog";
import {
  esPlanNoEncontrado,
  usePlan,
} from "@/features/planes/hooks/use-planes";
import { estaVigente } from "@/features/planes/utils/planes";

const RUTA_LISTADO = "/app/planes";

function CargandoFormulario() {
  return (
    <div
      role="status"
      className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
    >
      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
      Cargando formulario…
    </div>
  );
}

function ErrorDeCarga({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-600">
      <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {mensajeDeErrorApi(error, "No se pudieron cargar los datos del plan.")}
      </p>
      <Button
        type="button"
        onClick={onReintentar}
        className="min-h-[44px] rounded-lg bg-primary text-white hover:bg-primary-dark"
      >
        Reintentar
      </Button>
    </Card>
  );
}

function PlanNoDisponible({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600">
      <h2 className="text-lg font-extrabold text-[#181C26] dark:text-white">{titulo}</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{detalle}</p>
      <Button asChild variant="outline" className="min-h-[44px] rounded-xl font-bold">
        <Link to={RUTA_LISTADO}>Volver al listado de planes</Link>
      </Button>
    </Card>
  );
}

export function NuevoPlanPage() {
  return <Navigate to="/app/planes?nuevo=1" replace />;
}

function ContenidoEdicion({ idPlan }: { idPlan: string }) {
  const navigate = useNavigate();
  const { data: plan, isPending, isError, error, refetch } = usePlan(idPlan);
  if (isPending) return <CargandoFormulario />;
  if (isError) {
    return esPlanNoEncontrado(error) ? (
      <PlanNoDisponible titulo="Plan no encontrado" detalle="No existe un plan con ese identificador. Buscalo desde el listado de planes." />
    ) : (
      <ErrorDeCarga error={error} onReintentar={() => void refetch()} />
    );
  }
  // El back solo modifica planes vigentes (PATCH responde 404 con uno dado de baja).
  if (!estaVigente(plan)) {
    return <PlanNoDisponible titulo={`"${plan.nombre}" está dado de baja`} detalle="Un plan dado de baja ya no se puede editar. Si lo necesitás de nuevo, creá un plan nuevo." />;
  }
  return <EditarPlanDialog plan={plan} onClose={() => navigate(RUTA_LISTADO)} />;
}

// Los ids del DER son SERIAL: cualquier otra cosa en la URL no puede ser un plan.
function esIdValido(id: string | undefined): id is string {
  return id !== undefined && /^[1-9]\d*$/.test(id);
}

export function EditarPlanPage() {
  const { idPlan } = useParams();
  return (
    <OwnerLayout>
      <div className="space-y-6">
        {esIdValido(idPlan) ? (
          <ContenidoEdicion key={idPlan} idPlan={idPlan} />
        ) : (
          <PlanNoDisponible titulo="Plan no encontrado" detalle="No existe un plan con ese identificador. Buscalo desde el listado de planes." />
        )}
      </div>
    </OwnerLayout>
  );
}
