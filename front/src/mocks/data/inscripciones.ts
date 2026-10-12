// Copia de PLANES_DEMO e INSCRIPCIONES_DEMO (back/src/shared/db/datos-demo.ts). Cada interfaz copia
// una tabla del DER (planes, plan_precios, inscripciones, inscripcion_horarios, pagos). Los ids
// dependen del orden de carga en la base real: acá son de ejemplo.

export interface PlanMock {
  id_plan: number;
  tipo: "MENSUAL" | "CLASE_SUELTA";
  nombre: string;
  descripcion: string | null;
  clases_por_semana: number | null;
  dias_gracia: number;
  id_actividad_exclusiva: number | null;
  profesora_unica: boolean;
  fecha_alta: string;
  fecha_baja: string | null;
}

export interface PlanPrecioMock {
  id_plan_precio: number;
  id_plan: number;
  precio: number;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string | null;
}

export type EstadoInscripcionMock = "PREINSCRIPTA" | "ACTIVA" | "BAJA";

export interface InscripcionMock {
  id_inscripcion: number;
  id_alumno: number;
  id_plan: number;
  id_plan_precio: number;
  id_profesora: number;
  id_promocion: number | null;
  sin_cargo: boolean;
  fecha_inicio: string;
  fecha_fin_estimado: string | null;
  estado: EstadoInscripcionMock;
  motivo_baja: string | null;
  detalle_baja: string | null;
  observaciones: string | null;
  fecha_alta: string;
  fecha_baja: string | null;
  // inscripcion_horarios: en el mock alcanza con los ids, se arman al responder.
  ids_horarios: number[];
}

export interface PagoMock {
  id_pago: number;
  id_cuota: number;
  // El mock no guarda cuotas: este id hace de cuotas.id_inscripcion.
  id_inscripcion: number;
  forma_pago: "EFECTIVO" | "TRANSFERENCIA";
  estado: "PENDIENTE" | "CONFIRMADO" | "RECHAZADO";
  monto: number;
  fecha_pago: string;
  titular_cuenta_origen: string | null;
  fecha_hora_transferencia: string | null;
  id_usuario_registra: number;
  id_profesora_cobra: number | null;
  rendido: boolean;
  fecha_rendicion: string | null;
  id_usuario_confirma: number | null;
  fecha_confirmacion: string | null;
  motivo_rechazo: string | null;
  observaciones: string | null;
}

const VIGENCIA_PRECIOS = "2026-01-01T00:00:00.000Z";

function plan(id_plan: number, datos: Pick<PlanMock, "tipo" | "nombre" | "clases_por_semana" | "dias_gracia" | "profesora_unica" | "id_actividad_exclusiva">): PlanMock {
  return { id_plan, descripcion: null, fecha_alta: VIGENCIA_PRECIOS, fecha_baja: null, ...datos };
}

// El catálogo del centro: "Plan Kids" es exclusivo de la clase infantil (la 7 en semilla.ts).
export const PLANES_SEMILLA: PlanMock[] = [
  plan(1, { tipo: "MENSUAL", nombre: "Plan Básico", clases_por_semana: 2, dias_gracia: 5, profesora_unica: false, id_actividad_exclusiva: null }),
  plan(2, { tipo: "MENSUAL", nombre: "Plan Intermedio", clases_por_semana: 3, dias_gracia: 5, profesora_unica: false, id_actividad_exclusiva: null }),
  plan(3, { tipo: "MENSUAL", nombre: "Plan 5 días", clases_por_semana: 5, dias_gracia: 5, profesora_unica: false, id_actividad_exclusiva: null }),
  plan(4, { tipo: "MENSUAL", nombre: "Plan Premium", clases_por_semana: 5, dias_gracia: 5, profesora_unica: false, id_actividad_exclusiva: null }),
  plan(5, { tipo: "MENSUAL", nombre: "Plan Kids", clases_por_semana: 2, dias_gracia: 5, profesora_unica: false, id_actividad_exclusiva: 7 }),
  plan(6, { tipo: "CLASE_SUELTA", nombre: "Clase particular", clases_por_semana: null, dias_gracia: 0, profesora_unica: false, id_actividad_exclusiva: null }),
];

const PRECIOS = [25000, 30000, 42000, 52000, 22000, 6000];

export const PLAN_PRECIOS_SEMILLA: PlanPrecioMock[] = PRECIOS.map((precio, indice) => ({
  id_plan_precio: indice + 1,
  id_plan: indice + 1,
  precio,
  fecha_vigencia_desde: VIGENCIA_PRECIOS,
  fecha_vigencia_hasta: null,
}));

const UN_DIA_EN_MS = 86_400_000;

// Como la semilla del back, las inscripciones se cargan "hoy" (al levantar el mock), salvo las que
// piden empezar unos días antes (para ver una reserva vencida, US-07).
function inscripcion(
  id_inscripcion: number,
  datos: Pick<InscripcionMock, "id_alumno" | "id_plan" | "id_profesora" | "ids_horarios" | "estado"> &
    Partial<Pick<InscripcionMock, "motivo_baja" | "fecha_baja">>,
  diasAtras = 0,
): InscripcionMock {
  const alta = new Date(Date.now() - diasAtras * UN_DIA_EN_MS).toISOString();
  return {
    id_inscripcion,
    id_plan_precio: datos.id_plan,
    id_promocion: null,
    sin_cargo: false,
    fecha_inicio: `${alta.slice(0, 10)}T00:00:00.000Z`,
    fecha_fin_estimado: null,
    motivo_baja: null,
    detalle_baja: null,
    observaciones: null,
    fecha_alta: alta,
    fecha_baja: null,
    ...datos,
  };
}

// Alumnos de data/alumnos.ts y horarios de semilla.ts. Las PREINSCRIPTA esperan el primer pago
// (US-07): la de Mateo empezó hace 5 días y ya tiene la reserva vencida. Micaela está de baja (US-08).
export function inscripcionesSemilla(): InscripcionMock[] {
  return [
    inscripcion(1, { id_alumno: 1, id_plan: 1, id_profesora: 1, ids_horarios: [1, 2], estado: "PREINSCRIPTA" }),
    inscripcion(2, { id_alumno: 2, id_plan: 5, id_profesora: 2, ids_horarios: [3, 4], estado: "PREINSCRIPTA" }, 5),
    inscripcion(3, { id_alumno: 3, id_plan: 2, id_profesora: 1, ids_horarios: [1, 2], estado: "ACTIVA" }, 40),
    inscripcion(4, { id_alumno: 4, id_plan: 1, id_profesora: 1, ids_horarios: [1, 2], estado: "ACTIVA" }, 90),
    inscripcion(
      5,
      { id_alumno: 5, id_plan: 2, id_profesora: 3, ids_horarios: [5], estado: "BAJA", motivo_baja: "MUDANZA", fecha_baja: "2026-09-01T12:00:00.000Z" },
      200,
    ),
  ];
}

function pagoConfirmado(id_pago: number, id_inscripcion: number, monto: number): PagoMock {
  return {
    id_pago,
    id_cuota: id_pago,
    id_inscripcion,
    forma_pago: "EFECTIVO",
    estado: "CONFIRMADO",
    monto,
    fecha_pago: VIGENCIA_PRECIOS,
    titular_cuenta_origen: null,
    fecha_hora_transferencia: null,
    id_usuario_registra: 1,
    id_profesora_cobra: null,
    rendido: true,
    fecha_rendicion: null,
    id_usuario_confirma: 1,
    fecha_confirmacion: VIGENCIA_PRECIOS,
    motivo_rechazo: null,
    observaciones: null,
  };
}

// Cada pago cubre un mes (mocks/situacion-cuota.ts): la inscripción 3 pagó uno de los dos meses que
// lleva y está vencida, la 4 pagó los tres y está al día, y Micaela (5) se fue debiendo (US-08).
export function pagosSemilla(): PagoMock[] {
  return [
    pagoConfirmado(1, 3, PRECIOS[1]),
    ...[2, 3, 4].map((id) => pagoConfirmado(id, 4, PRECIOS[0])),
    ...[5, 6, 7].map((id) => pagoConfirmado(id, 5, PRECIOS[1])),
  ];
}
