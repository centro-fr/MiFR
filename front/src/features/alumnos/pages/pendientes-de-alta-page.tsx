import { useMemo, useState } from "react";
import { AlertCircle, Info, Loader2, RefreshCw, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FiltrosPendientes } from "@/features/alumnos/components/alta-definitiva/filtros-pendientes";
import { ListaPendientes } from "@/features/alumnos/components/alta-definitiva/lista-pendientes";
import { ModalConfirmarAlta } from "@/features/alumnos/components/alta-definitiva/modal-confirmar-alta";
import { useConfirmarAltaDefinitiva, usePreInscripcionesPendientes } from "@/features/alumnos/hooks/use-alta-definitiva";
import { useFormasDePrimerPago } from "@/features/alumnos/hooks/use-formas-de-primer-pago";
import type { CuerpoPrimerPago } from "@/features/alumnos/schemas/primer-pago";
import { FILTROS_INICIALES, filtrarPendientes, planesDe } from "@/features/alumnos/utils/pendientes-de-alta";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { usePromociones } from "@/features/promociones/hooks/use-promociones";
import type { PreInscripcionPendiente } from "@/types/alta-definitiva";
import { cn } from "@/utils/cn";

function Encabezado({ cantidad, actualizando, onActualizar }: { cantidad?: number; actualizando: boolean; onActualizar: () => void }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
            Pre-inscripciones pendientes
          </h1>
          {cantidad !== undefined && (
            <Badge
              variant="outline"
              className="rounded-full border-pink-200 bg-pink-100 px-3 py-1 text-sm font-extrabold text-primary-dark dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300 shadow-2xs"
            >
              {cantidad === 1 ? "1 pendiente" : `${cantidad} pendientes`}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
          Confirmá el alta definitiva del alumno al registrar el cobro o la transferencia de su primera cuota.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onActualizar}
        disabled={actualizando}
        className="inline-flex h-auto min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary pointer-fine:min-h-0 dark:border-white/15 dark:bg-transparent dark:text-slate-200"
      >
        <RefreshCw aria-hidden="true" className={cn("size-4", actualizando && "animate-spin")} />
        {actualizando ? "Actualizando..." : "Actualizar lista"}
      </Button>
    </header>
  );
}

function EstadoVacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
        <UserCheck className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-[#181C26] dark:text-white">{titulo}</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{detalle}</p>
    </Card>
  );
}

function ReglaDeNegocio() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-500/20 dark:bg-pink-500/10">
      <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
      <p className="text-sm text-slate-700 leading-relaxed dark:text-slate-300">
        <strong className="text-primary-dark dark:text-pink-300">Al registrar la primera cuota</strong>, el alumno pasa a{" "}
        <strong className="text-emerald-700 dark:text-emerald-300">activo</strong> y queda inscripto en el plan y los horarios que eligió. Si
        es menor, también se habilita la cuenta de su tutor/a.
      </p>
    </div>
  );
}

function useConfirmacion() {
  const { hasRole } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
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
        if (pago.formaPago === "TRANSFERENCIA" && !esPropietaria) {
          toast.success("Transferencia informada. Quedó pendiente de confirmación por la propietaria.");
        } else {
          toast.success(`${nombre} ${apellido} quedó activo`);
        }
      },
    });
  };

  return { confirmarAlta, seleccionada, abrir, cerrar: () => setSeleccionada(null), confirmar };
}

function ContenidoPendientes() {
  const { data: pendientes, isPending, isError, error, refetch, isFetching } = usePreInscripcionesPendientes();
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const formas = useFormasDePrimerPago();
  const promociones = usePromociones();
  const { confirmarAlta, seleccionada, abrir, cerrar, confirmar } = useConfirmacion();
  const visibles = useMemo(() => filtrarPendientes(pendientes ?? [], filtros), [pendientes, filtros]);
  const planes = useMemo(() => planesDe(pendientes ?? []), [pendientes]);

  const encabezado = (
    <Encabezado cantidad={pendientes?.length} actualizando={isFetching} onActualizar={() => void refetch()} />
  );
  if (isPending) {
    return (
      <>
        {encabezado}
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
        >
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
          Cargando pre-inscripciones pendientes…
        </div>
      </>
    );
  }
  if (isError) {
    return (
      <>
        {encabezado}
        <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-600">
          <AlertCircle aria-hidden="true" className="h-8 w-8 text-rose-600 dark:text-rose-300" />
          <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {mensajeDeErrorApi(error, "No se pudieron cargar las pre-inscripciones pendientes.")}
          </p>
          <Button
            type="button"
            onClick={() => void refetch()}
            className="min-h-[44px] rounded-lg bg-primary text-white hover:bg-primary-dark"
          >
            Reintentar
          </Button>
        </Card>
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
          promociones={promociones.data ?? []}
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
      <div className="space-y-6">
        <ContenidoPendientes />
      </div>
    </OwnerLayout>
  );
}
