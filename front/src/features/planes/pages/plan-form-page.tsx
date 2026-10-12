import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2, SearchX } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActividades } from "@/features/actividades/hooks/use-actividades";
import { BadgeEstadoPlan } from "@/features/planes/components/badges-plan";
import { FormularioPlan } from "@/features/planes/components/formulario-plan";
import { ModalBajaPlan } from "@/features/planes/components/modales-plan";
import {
  esPlanNoEncontrado,
  useActualizarPlan,
  useCrearPlan,
  useDarDeBajaPlan,
  usePlan,
  usePlanes,
} from "@/features/planes/hooks/use-planes";
import { aCuerpoActualizacion, aCuerpoCreacion, type PlanFormValues } from "@/features/planes/schemas/plan";
import { estaVigente } from "@/features/planes/utils/planes";
import type { Plan } from "@/types/plan";

const RUTA_LISTADO = "/app/planes";

function Encabezado({ titulo, detalle, acciones }: { titulo: ReactNode; detalle: string; acciones?: ReactNode }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl">
          <Link to={RUTA_LISTADO} aria-label="Volver al listado de planes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
              {titulo}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
            {detalle}
          </p>
        </div>
      </div>
      {acciones}
    </header>
  );
}

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
      <AlertCircle aria-hidden="true" className="h-8 w-8 text-rose-600 dark:text-rose-300" />
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
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
        <SearchX className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-[#181C26] dark:text-white">{titulo}</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{detalle}</p>
      <Button asChild variant="outline" className="min-h-[44px] rounded-xl font-bold">
        <Link to={RUTA_LISTADO}>Volver al listado de planes</Link>
      </Button>
    </Card>
  );
}

/** Actividades (para el selector) y planes (para el nombre repetido) que necesita el formulario. */
function useDatosDelFormulario() {
  const actividades = useActividades();
  const planes = usePlanes();
  const consultas = [actividades, planes];
  return {
    actividades: actividades.data,
    planes: planes.data,
    error: consultas.find((consulta) => consulta.isError)?.error ?? null,
    reintentar: () => consultas.forEach((consulta) => void consulta.refetch()),
  };
}

export function NuevoPlanPage() {
  const navigate = useNavigate();
  const crear = useCrearPlan();
  const { actividades, planes, error, reintentar } = useDatosDelFormulario();

  const guardar = (valores: PlanFormValues) => {
    crear.mutate(aCuerpoCreacion(valores), {
      onSuccess: (plan) => {
        toast.success(`Plan "${plan.nombre}" creado`);
        navigate(RUTA_LISTADO);
      },
    });
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <Encabezado
          titulo="Nuevo plan"
          detalle="Definí el tipo, la frecuencia, la actividad y el precio del plan."
        />
        {actividades && planes ? (
          <FormularioPlan
            actividades={actividades}
            planes={planes}
            guardando={crear.isPending}
            errorGuardado={crear.isError ? mensajeDeErrorApi(crear.error, "No se pudo crear el plan.") : null}
            onGuardar={guardar}
          />
        ) : error ? (
          <ErrorDeCarga error={error} onReintentar={reintentar} />
        ) : (
          <CargandoFormulario />
        )}
      </div>
    </OwnerLayout>
  );
}

function EdicionDePlan({ plan }: { plan: Plan }) {
  const navigate = useNavigate();
  const actualizar = useActualizarPlan();
  const darDeBaja = useDarDeBajaPlan();
  const [bajaAbierta, setBajaAbierta] = useState(false);
  const { actividades, planes, error, reintentar } = useDatosDelFormulario();

  const guardar = (valores: PlanFormValues) => {
    actualizar.mutate(
      { id: plan.id, cambios: aCuerpoActualizacion(plan, valores) },
      {
        onSuccess: (guardado) => {
          toast.success(`Cambios guardados en "${guardado.nombre}"`);
          navigate(RUTA_LISTADO);
        },
      },
    );
  };

  // mutateAsync y no mutate: al refrescarse, el plan llega dado de baja y esta vista se desmonta
  // antes de que corra el onSuccess de mutate, que React Query descarta en ese caso.
  const confirmarBaja = () => {
    darDeBaja
      .mutateAsync(plan.id)
      .then(() => {
        toast.info(`Plan "${plan.nombre}" dado de baja`);
        navigate(RUTA_LISTADO);
      })
      .catch(() => {
        // El error ya se muestra en el modal (darDeBaja.isError).
      });
  };

  const abrirBaja = () => {
    darDeBaja.reset();
    setBajaAbierta(true);
  };

  return (
    <>
      <Encabezado
        titulo={
          <>
            {plan.nombre} <BadgeEstadoPlan vigente />
          </>
        }
        detalle="Los cambios rigen para las próximas inscripciones y renovaciones."
        acciones={
          <Button
            type="button"
            variant="outline"
            onClick={abrirBaja}
            className="inline-flex h-auto min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 transition-colors hover:border-rose-600 hover:bg-rose-600 hover:text-white pointer-fine:min-h-0 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-600"
          >
            Dar de baja el plan
          </Button>
        }
      />
      {actividades && planes ? (
        <FormularioPlan
          plan={plan}
          actividades={actividades}
          planes={planes}
          guardando={actualizar.isPending}
          errorGuardado={actualizar.isError ? mensajeDeErrorApi(actualizar.error, "No se pudieron guardar los cambios.") : null}
          onGuardar={guardar}
        />
      ) : error ? (
        <ErrorDeCarga error={error} onReintentar={reintentar} />
      ) : (
        <CargandoFormulario />
      )}
      {bajaAbierta && (
        <ModalBajaPlan
          nombre={plan.nombre}
          dandoDeBaja={darDeBaja.isPending}
          error={darDeBaja.isError ? mensajeDeErrorApi(darDeBaja.error, "No se pudo dar de baja el plan.") : null}
          onClose={() => setBajaAbierta(false)}
          onConfirm={confirmarBaja}
        />
      )}
    </>
  );
}

function ContenidoEdicion({ idPlan }: { idPlan: string }) {
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
  return <EdicionDePlan plan={plan} />;
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
