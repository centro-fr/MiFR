// Datos de US-23 copiados de la base local (docker mifr-db) al 20/10/2026, para que el mock de
// honorarios muestre lo mismo que el back cuando tenga los endpoints. Son otros alumnos que los de
// alumnos.ts (que copia seed-demo): ver la nota de mocks/handlers/honorarios.ts.
// Las profesoras 1 a 3 coinciden con semilla.ts (Lucía Gómez, Carla Ruiz y Marina Sosa).
//
// Lo único que NO está en la base: las tarifas (la tabla tarifas_honorario todavía no se migró) y la
// suplencia, que se agrega para ver el ajuste en la pantalla.

export interface AlumnoHonorariosMock {
  id_alumno: number;
  nombre: string;
  apellido: string;
}

export interface PlanHonorariosMock {
  id_plan: number;
  nombre: string;
}

export interface InscripcionHonorariosMock {
  id_inscripcion: number;
  id_alumno: number;
  id_plan: number;
  id_profesora: number;
  sin_cargo: boolean;
  estado: "PREINSCRIPTA" | "ACTIVA" | "BAJA";
  /** DATE como AAAA-MM-DD. */
  fecha_inicio: string;
  /** Timestamp ISO de la baja. */
  fecha_baja: string | null;
}

/** Pago CONFIRMADO con la inscripción de su cuota: es la base de las tarifas por porcentaje. */
export interface CobroHonorariosMock {
  id_pago: number;
  id_inscripcion: number;
  monto: number;
  /** Timestamp ISO (UTC). */
  fecha_pago: string;
}

/** Clase suplida: suplencias + clases + horarios del DER, ya unidos. */
export interface ClaseSuplidaMock {
  id_clase: number;
  /** AAAA-MM-DD. */
  fecha_clase: string;
  hora_inicio: string;
  hora_fin: string;
  id_actividad: number;
  actividad: string;
  id_prof_ausente: number;
  id_prof_suplente: number;
}

export interface TarifaHonorarioMock {
  id_tarifa: number;
  id_profesora: number;
  concepto: "ALUMNO_A_CARGO" | "HORA_SUPLENCIA";
  id_plan: number | null;
  tipo_valor: "PORCENTAJE" | "MONTO_FIJO";
  valor: number;
  /** AAAA-MM-DD. */
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string | null;
}

export interface LiquidacionMock {
  id_liquidacion: number;
  id_profesora: number;
  /** AAAA-MM-DD. */
  periodo_desde: string;
  periodo_hasta: string;
  fecha_liquidacion: string;
  monto_total: number;
  estado: "BORRADOR" | "CERRADA" | "PAGADA";
}

export interface LiquidacionDetalleMock {
  id_liq_detalle: number;
  id_liquidacion: number;
  id_tarifa: number;
  concepto: "ALUMNO_A_CARGO" | "CLASE_SUPLIDA" | "DESCUENTO_AUSENCIA";
  id_inscripcion: number | null;
  id_clase: number | null;
  monto: number;
}

// alumnos + usuarios de la base: los que tienen alguna inscripción.
export const ALUMNOS_HONORARIOS: AlumnoHonorariosMock[] = [
  { id_alumno: 1, nombre: "Sofía", apellido: "Medina" },
  { id_alumno: 2, nombre: "Mateo", apellido: "Romero" },
  { id_alumno: 3, nombre: "Valentina", apellido: "Herrera" },
  { id_alumno: 4, nombre: "Adriel", apellido: "Coria" },
  { id_alumno: 5, nombre: "Mario", apellido: "Palenzona" },
  { id_alumno: 6, nombre: "Juan", apellido: "Gomez" },
];

export const PLANES_HONORARIOS: PlanHonorariosMock[] = [
  { id_plan: 1, nombre: "Básico" },
  { id_plan: 2, nombre: "Intermedio" },
  { id_plan: 3, nombre: "Personalizado 2 días" },
  { id_plan: 4, nombre: "Clase suelta" },
  { id_plan: 5, nombre: "Plan 5 días" },
];

// La 4 (Adriel Coria) sigue PREINSCRIPTA: no genera honorarios. La 5 es de clase suelta: se cuenta.
export const INSCRIPCIONES_HONORARIOS: InscripcionHonorariosMock[] = [
  { id_inscripcion: 1, id_alumno: 1, id_plan: 1, id_profesora: 1, sin_cargo: false, estado: "ACTIVA", fecha_inicio: "2026-10-13", fecha_baja: null },
  { id_inscripcion: 2, id_alumno: 2, id_plan: 3, id_profesora: 2, sin_cargo: false, estado: "ACTIVA", fecha_inicio: "2026-10-13", fecha_baja: null },
  { id_inscripcion: 3, id_alumno: 3, id_plan: 2, id_profesora: 2, sin_cargo: false, estado: "ACTIVA", fecha_inicio: "2026-10-13", fecha_baja: null },
  { id_inscripcion: 4, id_alumno: 4, id_plan: 3, id_profesora: 2, sin_cargo: false, estado: "PREINSCRIPTA", fecha_inicio: "2026-10-13", fecha_baja: null },
  { id_inscripcion: 5, id_alumno: 5, id_plan: 4, id_profesora: 2, sin_cargo: false, estado: "ACTIVA", fecha_inicio: "2026-10-13", fecha_baja: null },
  { id_inscripcion: 6, id_alumno: 6, id_plan: 1, id_profesora: 1, sin_cargo: false, estado: "ACTIVA", fecha_inicio: "2026-10-13", fecha_baja: null },
];

// pagos CONFIRMADO de la base, con cuotas.id_inscripcion.
export const COBROS_HONORARIOS: CobroHonorariosMock[] = [
  { id_pago: 1, id_inscripcion: 3, monto: 30000, fecha_pago: "2026-10-13T23:54:37.821Z" },
  { id_pago: 2, id_inscripcion: 5, monto: 6000, fecha_pago: "2026-10-14T01:35:34.361Z" },
  { id_pago: 3, id_inscripcion: 2, monto: 45000, fecha_pago: "2026-10-14T01:46:56.829Z" },
  { id_pago: 4, id_inscripcion: 1, monto: 25000, fecha_pago: "2026-10-14T01:49:02.532Z" },
  { id_pago: 5, id_inscripcion: 6, monto: 25000, fecha_pago: "2026-10-14T02:43:48.020Z" },
];

// No está en la base (no tiene suplencias): la clase 8 sí existe (Personalizado del martes 13/10,
// horario 18 de Carla Ruiz) y se supone que la cubrió Marina Sosa.
export const CLASES_SUPLIDAS_HONORARIOS: ClaseSuplidaMock[] = [
  {
    id_clase: 8,
    fecha_clase: "2026-10-13",
    hora_inicio: "18:00",
    hora_fin: "19:00",
    id_actividad: 6,
    actividad: "Personalizado",
    id_prof_ausente: 2,
    id_prof_suplente: 3,
  },
];

const INICIO_DE_ANIO = "2026-01-01";

// No están en la base: la regla acordada (back/honorarios-pendientes.md) es el 50% de lo cobrado de
// cada cuota. La hora de suplencia no tiene un valor acordado: $ 5.000 es de ejemplo.
export function tarifasSemilla(): TarifaHonorarioMock[] {
  return [1, 2, 3].flatMap((idProfesora, indice) => [
    {
      id_tarifa: indice * 2 + 1,
      id_profesora: idProfesora,
      concepto: "ALUMNO_A_CARGO" as const,
      id_plan: null,
      tipo_valor: "PORCENTAJE" as const,
      valor: 50,
      fecha_vigencia_desde: INICIO_DE_ANIO,
      fecha_vigencia_hasta: null,
    },
    {
      id_tarifa: indice * 2 + 2,
      id_profesora: idProfesora,
      concepto: "HORA_SUPLENCIA" as const,
      id_plan: null,
      tipo_valor: "MONTO_FIJO" as const,
      valor: 5000,
      fecha_vigencia_desde: INICIO_DE_ANIO,
      fecha_vigencia_hasta: null,
    },
  ]);
}
