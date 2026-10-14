import { useCallback, useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CircleCheck, Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fichaAlumnoQueryKey } from "@/features/alumnos/hooks/use-alumnos";
import type { AlumnoDetalle } from "@/features/alumnos/schemas/alumno";
import { BarraFiltros } from "@/features/transferencias/components/barra-filtros";
import { ListaTransferencias } from "@/features/transferencias/components/lista-transferencias";
import { ModalAprobarTransferencia } from "@/features/transferencias/components/modal-aprobar-transferencia";
import { ModalRechazarTransferencia } from "@/features/transferencias/components/modal-rechazar-transferencia";
import { PanelDetalle } from "@/features/transferencias/components/panel-detalle";
import {
  useAprobarTransferencia,
  useRechazarTransferencia,
  useTransferencias,
} from "@/features/transferencias/hooks/use-transferencias";
import {
  FILTROS_INICIALES,
  filtrarTransferencias,
  hayFiltrosActivos,
} from "@/features/transferencias/utils/filtros-transferencias";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { EstadoTransferencia, Transferencia } from "@/types/transferencia";
import { cn } from "@/utils/cn";

// Mismo corte que xl de Tailwind: desde ahí el detalle entra al costado de la lista.
const ESCRITORIO = "(min-width: 1280px)";
// Las horas desde la carga las calcula el back: se vuelven a pedir para que el plazo avance solo.
const REFRESCO_PLAZOS_MS = 60_000;

const TITULO_LISTA: Record<EstadoTransferencia, string> = {
  PENDIENTE: "Pendientes de verificación",
  CONFIRMADO: "Aprobadas",
  RECHAZADO: "Rechazadas",
};

function Encabezado({ pendientes, actualizando, onActualizar }: { pendientes?: number; actualizando: boolean; onActualizar: () => void }) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-dark xl:text-3xl dark:text-white">Transferencias pendientes de verificación</h1>
          {pendientes !== undefined && (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-1 text-sm font-extrabold shadow-2xs",
                pendientes > 0
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
              )}
            >
              {pendientes === 0 ? "Sin pendientes" : pendientes === 1 ? "1 pendiente" : `${pendientes} pendientes`}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
          Verificá cada transferencia en tu extracto bancario y aprobala o rechazala dentro de las 24 h desde que se informó.
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
        {actualizando ? "Actualizando..." : "Actualizar"}
      </Button>
    </header>
  );
}

function EstadoLista({ icono: Icono, titulo, detalle, tono = "neutro", children }: { icono: typeof Inbox; titulo: string; detalle: string; tono?: "neutro" | "exito"; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl",
          tono === "exito" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300",
        )}
      >
        <Icono className="size-7" />
      </span>
      <h3 className="text-lg font-extrabold text-dark dark:text-white">{titulo}</h3>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{detalle}</p>
      {children}
    </div>
  );
}

function ListaCargando() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col divide-y divide-border">
      <span className="sr-only">Cargando transferencias…</span>
      {Array.from({ length: 4 }, (_, indice) => (
        <div key={indice} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Lo que muestra la lista cuando no hay filas: nada que revisar o nada que coincida con los filtros. */
function ListaVacia({ estado, conFiltros, onLimpiar }: { estado: EstadoTransferencia; conFiltros: boolean; onLimpiar: () => void }) {
  if (conFiltros) {
    return (
      <EstadoLista icono={Inbox} titulo="Sin resultados" detalle="Ninguna transferencia coincide con los filtros aplicados.">
        <Button type="button" variant="outline" onClick={onLimpiar} className="min-h-[44px] rounded-xl font-bold">
          Limpiar filtros
        </Button>
      </EstadoLista>
    );
  }
  if (estado === "PENDIENTE") {
    return (
      <EstadoLista
        icono={CircleCheck}
        tono="exito"
        titulo="¡Todo al día!"
        detalle="No hay transferencias pendientes de verificación. Cuando un alumno informe una nueva, va a aparecer acá."
      />
    );
  }
  return <EstadoLista icono={Inbox} titulo={`No hay transferencias ${TITULO_LISTA[estado].toLowerCase()}`} detalle="Todavía no se resolvió ninguna." />;
}

interface ModalAbierto {
  accion: "aprobar" | "rechazar";
  // Se fija al abrir: al resolverla la lista se refresca y la seleccionada pasa a ser otra.
  transferencia: Transferencia;
}

// Al resolver una, la seleccionada se libera: en escritorio pasa sola a la siguiente más antigua.
function useResolucion(alResolver: () => void) {
  const queryClient = useQueryClient();
  const aprobar = useAprobarTransferencia();
  const rechazar = useRechazarTransferencia();
  const [modal, setModal] = useState<ModalAbierto | null>(null);
  const { reset: limpiarAprobacion } = aprobar;
  const { reset: limpiarRechazo } = rechazar;

  // Estable: el panel de detalle está memorizado y la recibe.
  const abrir = useCallback(
    (accion: ModalAbierto["accion"], transferencia: Transferencia) => {
      limpiarAprobacion();
      limpiarRechazo();
      setModal({ accion, transferencia });
    },
    [limpiarAprobacion, limpiarRechazo],
  );

  const terminar = (titulo: string, detalle: string) => {
    setModal(null);
    alResolver();
    toast.success(titulo, { description: detalle });
  };

  const confirmarAprobacion = (confirmarMontoDistinto: boolean) => {
    if (!modal) return;
    const { id, alumno } = modal.transferencia;
    // La ficha ya está en caché: la cargó el detalle.
    const esPrimeraCuota = queryClient.getQueryData<AlumnoDetalle>(fichaAlumnoQueryKey(alumno.id))?.inscripcion?.estado === "PREINSCRIPTA";
    aprobar.mutate(
      { id, confirmarMontoDistinto },
      {
        onSuccess: () =>
          terminar(
            "Transferencia aprobada",
            `${alumno.nombre} ${alumno.apellido} quedó “Al día”.${esPrimeraCuota ? " Se confirmó su alta definitiva." : ""}`,
          ),
      },
    );
  };

  const confirmarRechazo = (motivo: string) => {
    if (!modal) return;
    const { id, alumno } = modal.transferencia;
    const esPrimeraCuota = queryClient.getQueryData<AlumnoDetalle>(fichaAlumnoQueryKey(alumno.id))?.inscripcion?.estado === "PREINSCRIPTA";
    rechazar.mutate(
      { id, motivo },
      {
        onSuccess: () =>
          terminar(
            "Transferencia rechazada",
            esPrimeraCuota
              ? `${alumno.nombre} ${alumno.apellido} vuelve a quedar pendiente de cobro en Pendientes de alta.`
              : `${alumno.nombre} ${alumno.apellido} va a ver el motivo en sus transferencias.`,
          ),
      },
    );
  };

  return { modal, abrir, cerrar: () => setModal(null), aprobar, rechazar, confirmarAprobacion, confirmarRechazo };
}

function useListado() {
  const [estado, setEstado] = useState<EstadoTransferencia>("PENDIENTE");
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const pendientes = useTransferencias("PENDIENTE", { refetchInterval: REFRESCO_PLAZOS_MS });
  const listado = useTransferencias(estado);
  // Diferida: al resolver una, los datos nuevos llegan en la misma tarea que el cierre del modal y el
  // toast; así la lista se vuelve a pintar después y en tramos. Medido con CPU 4x en producción:
  // de 151 a menos de 100 ms. Los filtros no se difieren: lo que se escribe se ve al instante.
  const datosDelListado = useDeferredValue(listado.data);
  const visibles = useMemo(() => filtrarTransferencias(datosDelListado ?? [], filtros), [datosDelListado, filtros]);
  const cambiarEstado = (nuevo: EstadoTransferencia) => {
    setEstado(nuevo);
    // El tramo del plazo solo aplica a las pendientes.
    if (nuevo !== "PENDIENTE") setFiltros((actuales) => ({ ...actuales, tramo: null }));
  };

  const actualizar = () => Promise.all([pendientes.refetch(), estado === "PENDIENTE" ? null : listado.refetch()]);

  return { estado, filtros, setFiltros, pendientes, listado, visibles, cambiarEstado, actualizar };
}

function ContenidoTransferencias() {
  const { estado, filtros, setFiltros, pendientes, listado, visibles, cambiarEstado, actualizar } = useListado();
  const esEscritorio = useMediaQuery(ESCRITORIO);
  const [idSeleccionada, setIdSeleccionada] = useState<number | null>(null);
  // En escritorio siempre hay una abierta: la elegida o, si no, la más prioritaria de la lista.
  const seleccionada = visibles.find((t) => t.id === idSeleccionada) ?? (esEscritorio ? visibles[0] : undefined);
  // El panel es lo más pesado: se pinta después de lo urgente (la fila marcada, el modal que se
  // cierra) y en tramos que no bloquean. Medido con CPU 4x: al resolver una transferencia, el
  // detalle de la siguiente se montaba en la misma tarea y la llevaba a ~380 ms en dev.
  const detalle = useDeferredValue(seleccionada);
  const cerrarDetalle = useCallback(() => setIdSeleccionada(null), []);
  const resolucion = useResolucion(cerrarDetalle);
  const limpiar = () => setFiltros(FILTROS_INICIALES);
  const { modal, abrir } = resolucion;
  // Sobre la que muestra el panel (la diferida), que es la que la propietaria está mirando.
  const abrirAprobar = useCallback(() => detalle && abrir("aprobar", detalle), [detalle, abrir]);
  const abrirRechazar = useCallback(() => detalle && abrir("rechazar", detalle), [detalle, abrir]);

  return (
    <>
      <Encabezado pendientes={pendientes.data?.length} actualizando={pendientes.isFetching || listado.isFetching} onActualizar={() => void actualizar()} />
      <BarraFiltros estado={estado} filtros={filtros} onEstado={cambiarEstado} onChange={setFiltros} onLimpiar={limpiar} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden rounded-2xl border-border bg-white shadow-sm dark:bg-surface-low">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
            <h2 className="text-base font-extrabold text-dark dark:text-white">{TITULO_LISTA[estado]}</h2>
            {visibles.length > 0 && <p className="text-sm text-muted-foreground">Tocá una para ver el detalle</p>}
          </div>
          <CuerpoLista
            estado={estado}
            listado={listado}
            visibles={visibles}
            conFiltros={hayFiltrosActivos(filtros)}
            idSeleccionada={seleccionada?.id ?? null}
            onSeleccionar={setIdSeleccionada}
            onLimpiar={limpiar}
          />
        </Card>
        <PanelDetalle
          transferencia={detalle}
          esEscritorio={esEscritorio}
          onCerrar={cerrarDetalle}
          onAprobar={abrirAprobar}
          onRechazar={abrirRechazar}
        />
      </div>

      {modal?.accion === "aprobar" && (
        <ModalAprobarTransferencia
          transferencia={modal.transferencia}
          aprobando={resolucion.aprobar.isPending}
          error={resolucion.aprobar.error}
          onClose={resolucion.cerrar}
          onConfirm={resolucion.confirmarAprobacion}
        />
      )}
      {modal?.accion === "rechazar" && (
        <ModalRechazarTransferencia
          transferencia={modal.transferencia}
          rechazando={resolucion.rechazar.isPending}
          error={resolucion.rechazar.error}
          onClose={resolucion.cerrar}
          onConfirm={resolucion.confirmarRechazo}
        />
      )}
    </>
  );
}

interface CuerpoListaProps {
  estado: EstadoTransferencia;
  listado: ReturnType<typeof useTransferencias>;
  visibles: Transferencia[];
  conFiltros: boolean;
  idSeleccionada: number | null;
  onSeleccionar: (id: number) => void;
  onLimpiar: () => void;
}

function CuerpoLista({ estado, listado, visibles, conFiltros, idSeleccionada, onSeleccionar, onLimpiar }: CuerpoListaProps) {
  if (listado.isPending) return <ListaCargando />;
  if (listado.isError) {
    return (
      <EstadoLista icono={AlertCircle} titulo="No pudimos cargar las transferencias" detalle={mensajeDeErrorApi(listado.error, "Revisá tu conexión e intentá de nuevo.")}>
        <Button type="button" onClick={() => void listado.refetch()} className="min-h-[44px] rounded-lg bg-primary text-white hover:bg-primary-dark">
          Reintentar
        </Button>
      </EstadoLista>
    );
  }
  if (visibles.length === 0) return <ListaVacia estado={estado} conFiltros={conFiltros} onLimpiar={onLimpiar} />;
  return (
    <>
      <ListaTransferencias
        transferencias={visibles}
        idSeleccionada={idSeleccionada}
        columnaEstado={estado === "PENDIENTE" ? "Desde la carga" : "Estado"}
        onSeleccionar={onSeleccionar}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-slate-50 px-5 py-3 text-sm text-muted-foreground dark:bg-white/5">
        <p aria-live="polite">
          Mostrando {visibles.length} de {listado.data.length}
        </p>
        {listado.hasNextPage && (
          <Button type="button" variant="outline" disabled={listado.isFetchingNextPage} onClick={() => void listado.fetchNextPage()} className="min-h-[44px] rounded-lg font-bold">
            {listado.isFetchingNextPage ? "Cargando..." : "Ver más"}
          </Button>
        )}
      </div>
    </>
  );
}

export function TransferenciasPage() {
  return (
    <OwnerLayout>
      <div className="space-y-5">
        <ContenidoTransferencias />
      </div>
    </OwnerLayout>
  );
}
