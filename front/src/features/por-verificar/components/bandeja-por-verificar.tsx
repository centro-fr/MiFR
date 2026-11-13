import { Link } from "react-router-dom";
import { mensajeDeErrorApi } from "@/api/errores";
import { BOTON_FILA, LISTA_MOVIL_EN_TARJETA } from "@/components/ui/estilos-lista";
import { FilaMovil } from "@/components/ui/fila-movil";
import { Button } from "@/components/ui/button";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { Skeleton } from "@/components/ui/skeleton";
import { ModalConfirmarAlta } from "@/features/alumnos/components/alta-definitiva/modal-confirmar-alta";
import { useFormasDePrimerPago } from "@/features/alumnos/hooks/use-formas-de-primer-pago";
import { useCobrarAlta, useVerificarTransferencia } from "@/features/por-verificar/hooks/use-acciones-bandeja";
import type { useBandejaPorVerificar } from "@/features/por-verificar/hooks/use-bandeja-por-verificar";
import type { PendientePorVerificar } from "@/features/por-verificar/utils/bandeja";
import { usePromociones } from "@/features/promociones/hooks/use-promociones";
import { ModalDetalleAprobacion } from "@/features/transferencias/components/modal-detalle-aprobacion";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";

type Bandeja = ReturnType<typeof useBandejaPorVerificar>;

interface Props {
  bandeja: Bandeja;
  /** En el dashboard se muestran las primeras; la pantalla "Por verificar" muestra todas. */
  limite?: number;
  /**
   * "tabla": en pantallas grandes, una tabla como la de Efectivo a rendir (la pantalla "Por
   * verificar"); en el celular sigue siendo lista. "lista": siempre lista (el dashboard).
   */
  variante?: "lista" | "tabla";
}

/** "Valentina Herrera" → "VH": el mismo círculo con iniciales que el listado de alumnos. */
function Iniciales({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(/\s+/u)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toLocaleUpperCase("es");
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300"
    >
      {iniciales}
    </span>
  );
}

const accionDe = (item: PendientePorVerificar) => (item.tipo === "TRANSFERENCIA" ? "Verificar" : "Cobrar");

function BotonAccion({ item, onAccion }: { item: PendientePorVerificar; onAccion: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onAccion}
      aria-label={`${accionDe(item)}: ${item.alumno}`}
      className={BOTON_FILA}
    >
      {accionDe(item)}
    </Button>
  );
}

function Tabla({ items, onAccion }: { items: PendientePorVerificar[]; onAccion: (item: PendientePorVerificar) => void }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-100 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <tr>
          <th scope="col" className="px-6 py-3.5">Alumno</th>
          <th scope="col" className="px-4 py-3.5">A verificar</th>
          <th scope="col" className="px-4 py-3.5">Plan</th>
          <th scope="col" className="px-4 py-3.5">Cuota</th>
          <th scope="col" className="px-4 py-3.5">Fecha</th>
          <th scope="col" className="px-4 py-3.5">Monto</th>
          <th scope="col" className="px-6 py-3.5 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {items.map((item) => (
          <tr key={item.clave} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
            <td className="px-6 py-3.5">
              <div className="flex items-center gap-3">
                <Iniciales nombre={item.alumno} />
                <Link
                  to={`/app/alumnos/${item.idAlumno}`}
                  className="font-bold text-slate-900 transition-colors hover:text-primary dark:text-white dark:hover:text-pink-300"
                >
                  {item.alumno}
                </Link>
              </div>
            </td>
            <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{item.concepto}</td>
            <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{item.plan ?? "—"}</td>
            <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{item.cuota}</td>
            <td className="px-4 py-3.5 text-slate-600 tabular-nums first-letter:uppercase dark:text-slate-300">{item.cuando ?? "—"}</td>
            <td className="px-4 py-3.5 font-bold tabular-nums text-slate-900 dark:text-white">{formatearPrecio(item.monto)}</td>
            <td className="px-6 py-3.5 text-right">
              <BotonAccion item={item} onAccion={() => onAccion(item)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Fila({ item, onAccion }: { item: PendientePorVerificar; onAccion: () => void }) {
  return (
    <FilaMovil
      avatar={item.alumno}
      titulo={item.alumno}
      detalle={[
        item.concepto,
        [item.plan, item.cuota].filter(Boolean).join(" · "),
        item.cuando,
        <span key="monto" className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          {formatearPrecio(item.monto)}
        </span>,
      ]}
      acciones={<BotonAccion item={item} onAccion={onAccion} />}
    />
  );
}

function Cargando({ className }: { className?: string }) {
  return (
    <div aria-busy="true" aria-label="Cargando lo que hay por verificar" className={cn("space-y-3 py-3", className)}>
      {[0, 1, 2].map((indice) => (
        <Skeleton key={indice} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Lista "Por verificar" con sus acciones: Verificar (transferencia, US-17) o Cobrar (alta nueva, US-07). */
export function BandejaPorVerificar({ bandeja, limite, variante = "lista" }: Props) {
  const verificar = useVerificarTransferencia();
  const cobrar = useCobrarAlta();
  const formas = useFormasDePrimerPago();
  const promociones = usePromociones();

  const margen = variante === "tabla" ? "px-4" : undefined;
  if (bandeja.isPending) return <Cargando className={margen} />;
  if (bandeja.isError) {
    return (
      <EstadoErrorCarga
        className={cn("my-3", variante === "tabla" && "mx-4")}
        mensaje={mensajeDeErrorApi(bandeja.error, "No se pudo cargar lo que hay por verificar.")}
        reintentando={bandeja.isFetching}
        onReintentar={() => void bandeja.refetch()}
      />
    );
  }
  if (bandeja.items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No hay pagos por verificar.</p>;
  }

  const visibles = limite ? bandeja.items.slice(0, limite) : bandeja.items;
  const abrir = (item: PendientePorVerificar) =>
    item.tipo === "TRANSFERENCIA" ? verificar.abrir(item.transferencia) : cobrar.abrir(item.alta);
  const lista = (
    <ul aria-label="Pagos por verificar" className={cn(LISTA_MOVIL_EN_TARJETA, variante === "tabla" && "lg:hidden")}>
      {visibles.map((item) => (
        <Fila key={item.clave} item={item} onAccion={() => abrir(item)} />
      ))}
    </ul>
  );

  return (
    <>
      {variante === "tabla" ? (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <Tabla items={visibles} onAccion={abrir} />
          </div>
          {lista}
        </>
      ) : (
        lista
      )}

      <ModalDetalleAprobacion
        open={verificar.seleccionada !== null}
        transferencia={verificar.seleccionada}
        onClose={verificar.cerrar}
        onAprobar={verificar.onAprobar}
        onRechazar={verificar.onRechazar}
        aprobando={verificar.aprobando}
        rechazando={verificar.rechazando}
      />
      {cobrar.seleccionada && (
        <ModalConfirmarAlta
          pendiente={cobrar.seleccionada}
          formas={formas}
          promociones={promociones.data ?? []}
          confirmando={cobrar.confirmando}
          error={cobrar.error}
          onClose={cobrar.cerrar}
          onConfirm={cobrar.confirmar}
        />
      )}
    </>
  );
}
