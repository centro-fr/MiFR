import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function VolverAlListado() {
  return (
    <Link
      to={RUTA_LISTADO}
      className="inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-transparent dark:text-slate-300"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Volver al listado de planes
    </Link>
  );
}

function Encabezado({ icono, titulo, detalle, acciones }: { icono: ReactNode; titulo: ReactNode; detalle: string; acciones?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:bg-surface-low">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          {icono}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-extrabold tracking-tight break-words text-slate-900 sm:text-xl dark:text-white">{titulo}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{detalle}</p>
        </div>
      </div>
      {acciones}
    </header>
  );
}

function CargandoFormulario() {
  return (
    <div role="status" aria-live="polite" className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <span className="sr-only">Cargando el formulario…</span>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

function ErrorDeCarga({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {mensajeDeErrorApi(error, "No se pudieron cargar los datos del plan.")}
      </p>
      <Button type="button" onClick={onReintentar} className="min-h-[44px] rounded-xl px-5 font-bold">
        Reintentar
      </Button>
    </div>
  );
}

function PlanNoDisponible({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-2xl bg-pink-100 text-primary-dark dark:bg-pink-500/15 dark:text-pink-300">
        <SearchX className="size-8" />
      </span>
      <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{titulo}</h2>
      <p className="max-w-[340px] text-sm text-muted-foreground">{detalle}</p>
    </div>
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
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 md:gap-5">
        <VolverAlListado />
        <Encabezado icono={<Plus className="size-5" />} titulo="Nuevo plan" detalle="Definí el tipo, la frecuencia, la actividad y el precio del plan." />
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
        icono={<Pencil className="size-5" />}
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
            className="min-h-[44px] rounded-xl border-rose-200 bg-white px-4 font-bold text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300"
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
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 md:gap-5">
        <VolverAlListado />
        {esIdValido(idPlan) ? (
          <ContenidoEdicion key={idPlan} idPlan={idPlan} />
        ) : (
          <PlanNoDisponible titulo="Plan no encontrado" detalle="No existe un plan con ese identificador. Buscalo desde el listado de planes." />
        )}
      </div>
    </OwnerLayout>
  );
}
