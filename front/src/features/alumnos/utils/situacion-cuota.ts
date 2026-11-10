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

const PESO_ESTADO_CUOTA: Record<EstadoCuota, number> = {
  VENCIDA: 1,
  CLASE_SUELTA_VENCIDA: 1,
  POR_VENCER: 2,
  PENDIENTE_DE_PAGO: 3,
  AL_DIA: 4,
  CLASE_SUELTA_VIGENTE: 4,
};

export type SituacionCuotaComparable =
  | {
    estado: EstadoCuota;
    dias_restantes?: number | null;
    fecha_vencimiento?: string | null;
  }
  | null
  | undefined;

/**
 * Compara dos situaciones de cuota para ordenar:
 * 1. Cuotas vencidas (mayor vencimiento / mayor atraso primero).
 * 2. Cuotas por vencer (más próximas a vencer primero).
 * 3. Pendientes de pago.
 * 4. Cuotas al día (más próximas a renovar primero).
 * 5. Sin cuota / sin datos.
 */
export function compararPorEstadoCuotaYMora(
  cuotaA: SituacionCuotaComparable,
  cuotaB: SituacionCuotaComparable,
): number {
  const pesoA = cuotaA?.estado ? PESO_ESTADO_CUOTA[cuotaA.estado] ?? 5 : 5;
  const pesoB = cuotaB?.estado ? PESO_ESTADO_CUOTA[cuotaB.estado] ?? 5 : 5;

  if (pesoA !== pesoB) {
    return pesoA - pesoB;
  }

  // Mismo grupo de prioridad:
  if (cuotaA?.dias_restantes != null && cuotaB?.dias_restantes != null) {
    if (cuotaA.dias_restantes !== cuotaB.dias_restantes) {
      // Menor número de días restantes va primero (-30 < -5 < 0 < 3 < 20)
      return cuotaA.dias_restantes - cuotaB.dias_restantes;
    }
  } else if (cuotaA?.fecha_vencimiento && cuotaB?.fecha_vencimiento) {
    const compFecha = cuotaA.fecha_vencimiento.localeCompare(cuotaB.fecha_vencimiento);
    if (compFecha !== 0) return compFecha;
  }

  return 0;
}

/**
 * Ordena alumnos por Estado de Cuota (mayor vencimiento primero) y desempata por fecha de alta / id.
 */
export function compararAlumnosPorCuota<
  T extends {
    situacion_cuota?: SituacionCuotaComparable;
    fecha_alta?: string;
    id_alumno?: number;
  },
>(a: T, b: T): number {
  const compCuota = compararPorEstadoCuotaYMora(a.situacion_cuota, b.situacion_cuota);
  if (compCuota !== 0) return compCuota;

  if (a.fecha_alta && b.fecha_alta) {
    const compAlta = b.fecha_alta.localeCompare(a.fecha_alta);
    if (compAlta !== 0) return compAlta;
  }

  if (a.id_alumno != null && b.id_alumno != null) {
    return b.id_alumno - a.id_alumno;
  }

  return 0;
}

