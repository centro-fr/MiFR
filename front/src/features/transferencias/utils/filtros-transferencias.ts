import { normalizarBusqueda } from "@/features/alumnos/utils/normalizar-busqueda";
import { tramoDePlazo, type TramoPlazo } from "@/features/transferencias/utils/plazo-verificacion";
import type { Transferencia } from "@/types/transferencia";

// Filtros de la pantalla que el back no ofrece (solo filtra por estado y alumno): se aplican sobre
// lo ya cargado. Funciones puras: se testean sin render.

export type OrdenTransferencias = "ANTIGUAS" | "RECIENTES" | "MONTO";

export interface FiltrosTransferencias {
  busqueda: string;
  /** Día de la transferencia, "AAAA-MM-DD" del input date; "" sin filtro. */
  fecha: string;
  /** Solo para las pendientes: se elige tocando las tarjetas del resumen. */
  tramo: TramoPlazo | null;
  orden: OrdenTransferencias;
}

// Las más recientes primero (decisión de la propietaria); el color del plazo marca las que pasan las 24 horas.
export const FILTROS_INICIALES: FiltrosTransferencias = { busqueda: "", fecha: "", tramo: null, orden: "RECIENTES" };

export function hayFiltrosActivos(filtros: FiltrosTransferencias): boolean {
  return (
    filtros.busqueda.trim() !== "" ||
    filtros.fecha !== "" ||
    filtros.tramo !== null ||
    filtros.orden !== FILTROS_INICIALES.orden
  );
}

/** Timestamp ISO → "AAAA-MM-DD" en el huso horario de quien mira, para compararlo con el input date. */
export function diaLocal(timestamp: string): string {
  const fecha = new Date(timestamp);
  const dosDigitos = (valor: number) => String(valor).padStart(2, "0");
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

function coincideBusqueda({ alumno }: Transferencia, busqueda: string): boolean {
  const buscado = normalizarBusqueda(busqueda.trim());
  return buscado === "" || normalizarBusqueda(`${alumno.nombre} ${alumno.apellido}`).includes(buscado);
}

const COMPARADORES: Record<OrdenTransferencias, (a: Transferencia, b: Transferencia) => number> = {
  ANTIGUAS: (a, b) => a.cargadaEl.localeCompare(b.cargadaEl),
  RECIENTES: (a, b) => b.cargadaEl.localeCompare(a.cargadaEl),
  MONTO: (a, b) => b.monto - a.monto,
};

export function filtrarTransferencias(transferencias: Transferencia[], filtros: FiltrosTransferencias): Transferencia[] {
  return transferencias
    .filter(
      (transferencia) =>
        coincideBusqueda(transferencia, filtros.busqueda) &&
        (filtros.fecha === "" || (transferencia.realizadaEl !== null && diaLocal(transferencia.realizadaEl) === filtros.fecha)) &&
        (filtros.tramo === null || (transferencia.estado === "PENDIENTE" && tramoDePlazo(transferencia) === filtros.tramo)),
    )
    .sort(COMPARADORES[filtros.orden]);
}
