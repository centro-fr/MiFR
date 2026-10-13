import type { EstadoCuota, InscripcionDeAlumno, SituacionCuota } from "@/features/alumnos/schemas/alumno";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";

// Cómo se muestra la situación de cuota que calcula el back (US-18). Funciones puras: se testean sin render.

/** Colores de US-10: verde al día, amarillo por vencer, rojo vencida; neutro sin cuota paga. */
export type TonoCuota = "al-dia" | "por-vencer" | "vencida" | "sin-pago";

const ETIQUETAS: Record<EstadoCuota, string> = {
  AL_DIA: "Al día",
  POR_VENCER: "Por vencer",
  VENCIDA: "Vencida",
  CLASE_SUELTA_VIGENTE: "Clase suelta vigente",
  CLASE_SUELTA_VENCIDA: "Clase suelta vencida",
  PENDIENTE_DE_PAGO: "Sin cuota paga",
};

const TONOS: Record<EstadoCuota, TonoCuota> = {
  AL_DIA: "al-dia",
  POR_VENCER: "por-vencer",
  VENCIDA: "vencida",
  CLASE_SUELTA_VIGENTE: "al-dia",
  CLASE_SUELTA_VENCIDA: "vencida",
  PENDIENTE_DE_PAGO: "sin-pago",
};

export function etiquetaCuota(estado: EstadoCuota): string {
  return ETIQUETAS[estado];
}

export function tonoCuota(estado: EstadoCuota): TonoCuota {
  return TONOS[estado];
}

function dias(cantidad: number): string {
  return cantidad === 1 ? "1 día" : `${cantidad} días`;
}

/** "Vence en 5 días", "Vence hoy" o "Venció hace 3 días"; null sin cuota paga. */
export function detalleVencimiento({ dias_restantes: restantes, fecha_vencimiento: fecha }: SituacionCuota): string | null {
  if (restantes === null || fecha === null) return null;
  const textoFecha = formatearFecha(fecha);
  const sufijoFecha = textoFecha ? ` (${textoFecha})` : "";
  if (restantes > 0) return `Vence en ${dias(restantes)}${sufijoFecha}`;
  if (restantes === 0) return "Vence hoy";
  return `Venció hace ${dias(-restantes)}${sufijoFecha}`;
}

export interface DeudaAlIrse {
  planes: string[];
  /** El mayor atraso entre las inscripciones que debía. */
  diasDeAtraso: number;
}

// Debía quien se fue con la cuota vencida, aun dentro de los días de gracia. Una clase suelta
// vencida ya estaba paga, y quien nunca pagó no llegó a empezar: ninguno de los dos debe.
function debia(situacion: SituacionCuota | null): situacion is SituacionCuota & { dias_restantes: number } {
  return (situacion?.estado === "VENCIDA" || situacion?.estado === "POR_VENCER") && situacion.dias_restantes !== null;
}

/** Lo que debía el alumno el día de su baja (US-08), o null si estaba al día. */
export function deudaAlIrse(inscripcionesDeLaBaja: InscripcionDeAlumno[]): DeudaAlIrse | null {
  const conDeuda = inscripcionesDeLaBaja.filter((inscripcion) => debia(inscripcion.situacion_cuota));
  if (conDeuda.length === 0) return null;
  return {
    planes: conDeuda.map((inscripcion) => inscripcion.plan.nombre),
    diasDeAtraso: Math.max(...conDeuda.map((inscripcion) => -(inscripcion.situacion_cuota?.dias_restantes ?? 0))),
  };
}

export function textoDeuda({ planes, diasDeAtraso }: DeudaAlIrse): string {
  return `Cuando se dio de baja debía la cuota de ${planes.join(" y ")}, vencida hace ${dias(diasDeAtraso)}.`;
}
