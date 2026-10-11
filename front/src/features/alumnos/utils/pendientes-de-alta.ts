import type { HorarioPreInscripcion, PreInscripcionPendiente } from "@/types/alta-definitiva";
import type { DiaSemana } from "@/types/horarios";
import { normalizarParaBuscar } from "@/utils/texto";

// Lógica de la lista de pre-inscripciones pendientes (US-07). Funciones puras: se testean sin render.

export type PeriodoPendientes = "TODAS" | "7" | "30";

export interface FiltrosPendientes {
  busqueda: string;
  /** "" = todos los planes. */
  idPlan: string;
  periodo: PeriodoPendientes;
}

export const FILTROS_INICIALES: FiltrosPendientes = { busqueda: "", idPlan: "", periodo: "TODAS" };

const MS_POR_DIA = 86_400_000;

const DIA_CORTO: Record<DiaSemana, string> = {
  LUNES: "Lun",
  MARTES: "Mar",
  MIERCOLES: "Mié",
  JUEVES: "Jue",
  VIERNES: "Vie",
  SABADO: "Sáb",
  DOMINGO: "Dom",
};

// Se sigue exportando desde acá: la usan la lista y el modal de US-07.
export { formatearPrecio } from "@/utils/moneda";

function coincideBusqueda(pendiente: PreInscripcionPendiente, busqueda: string): boolean {
  const texto = normalizarParaBuscar(busqueda);
  if (texto === "") return true;
  const nombres = [`${pendiente.nombre} ${pendiente.apellido}`];
  if (pendiente.tutor) nombres.push(`${pendiente.tutor.nombre} ${pendiente.tutor.apellido}`);
  if (nombres.some((nombre) => normalizarParaBuscar(nombre).includes(texto))) return true;
  // El DNI se guarda solo con dígitos: "42.990" también tiene que encontrarlo.
  const digitos = busqueda.replace(/\D/g, "");
  return digitos !== "" && (pendiente.dni ?? "").includes(digitos);
}

function dentroDelPeriodo(pendiente: PreInscripcionPendiente, periodo: PeriodoPendientes, ahora: Date): boolean {
  if (periodo === "TODAS") return true;
  const antiguedad = ahora.getTime() - new Date(pendiente.fechaPreInscripcion).getTime();
  return antiguedad <= Number(periodo) * MS_POR_DIA;
}

export function filtrarPendientes(
  pendientes: PreInscripcionPendiente[],
  filtros: FiltrosPendientes,
  ahora: Date = new Date(),
): PreInscripcionPendiente[] {
  return pendientes.filter(
    (pendiente) =>
      coincideBusqueda(pendiente, filtros.busqueda) &&
      (filtros.idPlan === "" || pendiente.idPlan === filtros.idPlan) &&
      dentroDelPeriodo(pendiente, filtros.periodo, ahora),
  );
}

export function hayFiltrosActivos(filtros: FiltrosPendientes): boolean {
  return filtros.busqueda.trim() !== "" || filtros.idPlan !== "" || filtros.periodo !== "TODAS";
}

/** Los planes que aparecen en la lista, sin repetir, para el filtro. */
export function planesDe(pendientes: PreInscripcionPendiente[]): { id: string; nombre: string }[] {
  const planes = new Map(pendientes.map((p) => [p.idPlan, p.nombrePlan]));
  return [...planes].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** ["Lun", "Mié", "Vie"] → "Lun, Mié y Vie". */
function enumerar(partes: string[]): string {
  return partes.length < 2 ? partes.join("") : `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}

/** Agrupa los días que comparten franja: "Lun y Mié 18:00 a 19:00". */
export function textoHorarios(horarios: HorarioPreInscripcion[]): string {
  const porFranja = new Map<string, string[]>();
  for (const { dia, horaInicio, horaFin } of horarios) {
    const franja = `${horaInicio} a ${horaFin}`;
    porFranja.set(franja, [...(porFranja.get(franja) ?? []), DIA_CORTO[dia]]);
  }
  return [...porFranja].map(([franja, dias]) => `${enumerar(dias)} ${franja}`).join(" · ");
}

export function actividadesDe(horarios: HorarioPreInscripcion[]): string {
  return [...new Set(horarios.map((h) => h.actividad))].join(", ");
}
