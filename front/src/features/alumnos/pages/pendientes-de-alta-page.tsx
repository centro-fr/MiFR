import { useMemo, useState } from "react";
import { Info, RefreshCw, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosPendientes } from "@/features/alumnos/components/alta-definitiva/filtros-pendientes";
import { ListaPendientes } from "@/features/alumnos/components/alta-definitiva/lista-pendientes";
import { ModalConfirmarAlta } from "@/features/alumnos/components/alta-definitiva/modal-confirmar-alta";
import { useConfirmarAltaDefinitiva, usePreInscripcionesPendientes } from "@/features/alumnos/hooks/use-alta-definitiva";
import type { CuerpoPrimerPago } from "@/features/alumnos/schemas/primer-pago";
import { FILTROS_INICIALES, filtrarPendientes, planesDe } from "@/features/alumnos/utils/pendientes-de-alta";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import type { FormaPrimerPago, PreInscripcionPendiente } from "@/types/alta-definitiva";

// Como en pago.routes.ts: el efectivo lo registra quien tenga PAGOS_REGISTRAR; una transferencia
// recibida, solo la propietaria con PAGOS_CONFIRMAR.
function useFormasDePrimerPago(): FormaPrimerPago[] {
  const { hasRole, hasPermission } = usePermissions();
  const formas: FormaPrimerPago[] = [];
  if (hasPermission("PAGOS_REGISTRAR")) formas.push("EFECTIVO");
  if (hasRole("PROPIETARIA") && hasPermission("PAGOS_CONFIRMAR")) formas.push("TRANSFERENCIA");
  return formas;
}

function Encabezado({ cantidad, actualizando, onActualizar }: { cantidad?: number; actualizando: boolean; onActualizar: () => void }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">Pre-inscripciones pendientes</h1>
          {cantidad !== undefined && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-sm font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
              {cantidad === 1 ? "1 pendiente" : `${cantidad} pendientes`}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">Confirmá el alta definitiva del alumno al registrar el cobro o la transferencia de su primera cuota.</p>
      </div>
      <Button type="button" variant="outline" onClick={onActualizar} disabled={actualizando} className="rounded-xl font-bold">
        <RefreshCw aria-hidden="true" className={actualizando ? "animate-spin" : undefined} />
        {actualizando ? "Actualizando..." : "Actualizar lista"}
      </Button>
    </header>
  );
}

function ListaSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Cargando pre-inscripciones pendientes…</span>
      <Skeleton className="h-11 rounded-xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function EstadoVacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-14 text-center dark:border-white/15">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
        <UserCheck className="size-7" />
      </span>
      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{titulo}</h2>
      <p className="max-w-[340px] text-sm text-muted-foreground">{detalle}</p>
    </div>
  );
}

function ReglaDeNegocio() {
  return (
    <aside className="flex items-start gap-2.5 rounded-xl border border-pink-200 bg-pink-50 p-3 dark:border-pink-500/20 dark:bg-pink-500/10">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-sm text-slate-700 dark:text-slate-300">
        <strong className="text-primary-dark dark:text-pink-300">Al registrar la primera cuota</strong>, el alumno pasa a{" "}
        <strong className="text-emerald-700 dark:text-emerald-300">activo</strong> y queda inscripto en el plan y los horarios que eligió. Si
        es menor, también se habilita la cuenta de su tutor/a.
      </p>
    </aside>
  );
}

function useConfirmacion() {
  const confirmarAlta = useConfirmarAltaDefinitiva();
  const [seleccionada, setSeleccionada] = useState<PreInscripcionPendiente | null>(null);

  const abrir = (pendiente: PreInscripcionPendiente) => {
    confirmarAlta.reset();
    setSeleccionada(pendiente);
  };

  const confirmar = (pago: CuerpoPrimerPago) => {
    if (!seleccionada) return;
    const { nombre, apellido } = seleccionada;
    confirmarAlta.mutate(pago, {
      onSuccess: () => {
        setSeleccionada(null);
        toast.success(`${nombre} ${apellido} quedó activo`);
      },
    });
  };

  return { confirmarAlta, seleccionada, abrir, cerrar: () => setSeleccionada(null), confirmar };
}

function ContenidoPendientes() {
  const { data: pendientes, isPending, isError, error, refetch, isFetching } = usePreInscripcionesPendientes();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const formas = useFormasDePrimerPago();
  const { confirmarAlta, seleccionada, abrir, cerrar, confirmar } = useConfirmacion();
  const visibles = useMemo(() => filtrarPendientes(pendientes ?? [], filtros), [pendientes, filtros]);
  const planes = useMemo(() => planesDe(pendientes ?? []), [pendientes]);

  const encabezado = (
    <Encabezado cantidad={pendientes?.length} actualizando={isFetching} onActualizar={() => void refetch()} />
  );
  if (isPending) return <>{encabezado}<ListaSkeleton /></>;
  if (isError) {
    return (
      <>
        {encabezado}
        <p role="alert" className="py-10 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
          {mensajeDeErrorApi(error, "No se pudieron cargar las pre-inscripciones pendientes.")}
        </p>
      </>
    );
  }

  return (
    <>
      {encabezado}
      {pendientes.length === 0 ? (
        <EstadoVacio titulo="No hay pre-inscripciones pendientes" detalle="Cuando se pre-inscriba un alumno nuevo, va a aparecer acá hasta que abone su primera cuota." />
      ) : (
        <>
          <FiltrosPendientes filtros={filtros} planes={planes} onChange={setFiltros} onLimpiar={() => setFiltros(FILTROS_INICIALES)} />
          {visibles.length === 0 ? (
            <EstadoVacio titulo="Sin resultados" detalle="Ninguna pre-inscripción coincide con los filtros." />
          ) : (
            <ListaPendientes pendientes={visibles} puedeConfirmar={formas.length > 0} onConfirmar={abrir} />
          )}
          <p aria-live="polite" className="text-sm text-muted-foreground">
            Mostrando {visibles.length} de {pendientes.length} pre-inscripciones
          </p>
        </>
      )}
      <ReglaDeNegocio />
      {seleccionada && (
        <ModalConfirmarAlta
          pendiente={seleccionada}
          formas={formas}
          confirmando={confirmarAlta.isPending}
          error={confirmarAlta.error}
          onClose={cerrar}
          onConfirm={confirmar}
        />
      )}
    </>
  );
}

export function PendientesDeAltaPage() {
  return (
    <OwnerLayout>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 md:gap-5">
        <ContenidoPendientes />
      </div>
    </OwnerLayout>
  );
}
