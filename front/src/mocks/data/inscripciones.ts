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

// "Personalizado 2 días" es exclusivo de la actividad personalizada (la 2 en semilla.ts).
export const PLANES_SEMILLA: PlanMock[] = [
  plan(1, { tipo: "MENSUAL", nombre: "Básico", clases_por_semana: 2, dias_gracia: 5, profesora_unica: false, id_actividad_exclusiva: null }),
  plan(2, { tipo: "MENSUAL", nombre: "Intermedio", clases_por_semana: 3, dias_gracia: 5, profesora_unica: false, id_actividad_exclusiva: null }),
  plan(3, { tipo: "MENSUAL", nombre: "Personalizado 2 días", clases_por_semana: 2, dias_gracia: 5, profesora_unica: true, id_actividad_exclusiva: 2 }),
  plan(4, { tipo: "CLASE_SUELTA", nombre: "Clase suelta", clases_por_semana: null, dias_gracia: 0, profesora_unica: false, id_actividad_exclusiva: null }),
];

const PRECIOS = [25000, 30000, 45000, 6000];

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
  datos: Pick<InscripcionMock, "id_alumno" | "id_plan" | "id_profesora" | "ids_horarios" | "estado">,
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

// Alumnos de data/alumnos.ts y horarios de semilla.ts: Sofía con Lucía (lun y mié), Mateo y
// Valentina con Carla (mar y jue). Las PREINSCRIPTA esperan el primer pago (US-07); la de Mateo
// empezó hace 5 días y ya tiene la reserva vencida.
export function inscripcionesSemilla(): InscripcionMock[] {
  return [
    inscripcion(1, { id_alumno: 1, id_plan: 1, id_profesora: 1, ids_horarios: [1, 2], estado: "PREINSCRIPTA" }),
    inscripcion(2, { id_alumno: 2, id_plan: 3, id_profesora: 2, ids_horarios: [3, 4], estado: "PREINSCRIPTA" }, 5),
    inscripcion(3, { id_alumno: 3, id_plan: 2, id_profesora: 2, ids_horarios: [3, 4], estado: "ACTIVA" }),
  ];
}
