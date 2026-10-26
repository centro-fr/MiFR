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
    inscripcion(1, { id_alumno: 1, id_plan: 1, id_profesora: 1, ids_horarios: [1, 3], estado: "PREINSCRIPTA" }),
    inscripcion(2, { id_alumno: 2, id_plan: 5, id_profesora: 2, ids_horarios: [26, 27], estado: "PREINSCRIPTA" }, 5),
    inscripcion(3, { id_alumno: 3, id_plan: 2, id_profesora: 1, ids_horarios: [1, 3, 5], estado: "ACTIVA" }, 40),
    inscripcion(4, { id_alumno: 4, id_plan: 1, id_profesora: 1, ids_horarios: [1, 3], estado: "ACTIVA" }, 90),
    inscripcion(
      5,
      { id_alumno: 5, id_plan: 2, id_profesora: 3, ids_horarios: [28], estado: "BAJA", motivo_baja: "MUDANZA", fecha_baja: "2026-09-01T12:00:00.000Z" },
      200,
    ),

    // 5 Vencidas (diasAtras >= 42)
    inscripcion(11, { id_alumno: 11, id_plan: 3, id_profesora: 1, ids_horarios: [1, 3], estado: "ACTIVA" }, 50),
    inscripcion(12, { id_alumno: 12, id_plan: 1, id_profesora: 2, ids_horarios: [22, 24], estado: "ACTIVA" }, 45),
    inscripcion(13, { id_alumno: 13, id_plan: 2, id_profesora: 3, ids_horarios: [28, 30], estado: "ACTIVA" }, 48),
    inscripcion(14, { id_alumno: 14, id_plan: 4, id_profesora: 1, ids_horarios: [1, 3], estado: "ACTIVA" }, 55),
    inscripcion(15, { id_alumno: 15, id_plan: 1, id_profesora: 2, ids_horarios: [22, 24], estado: "ACTIVA" }, 42),

    // 5 Por vencer (diasAtras entre 31 y 34, dentro del período de gracia de 5 días)
    inscripcion(16, { id_alumno: 16, id_plan: 2, id_profesora: 1, ids_horarios: [1, 3], estado: "ACTIVA" }, 32),
    inscripcion(17, { id_alumno: 17, id_plan: 4, id_profesora: 2, ids_horarios: [22, 24], estado: "ACTIVA" }, 33),
    inscripcion(18, { id_alumno: 18, id_plan: 1, id_profesora: 3, ids_horarios: [28, 30], estado: "ACTIVA" }, 31),
    inscripcion(19, { id_alumno: 19, id_plan: 3, id_profesora: 1, ids_horarios: [1, 3], estado: "ACTIVA" }, 34),
    inscripcion(20, { id_alumno: 20, id_plan: 2, id_profesora: 2, ids_horarios: [22, 24], estado: "ACTIVA" }, 32),

    // 5 Al día (diasAtras entre 5 y 15)
    inscripcion(21, { id_alumno: 21, id_plan: 4, id_profesora: 1, ids_horarios: [1, 3], estado: "ACTIVA" }, 10),
    inscripcion(22, { id_alumno: 22, id_plan: 1, id_profesora: 2, ids_horarios: [22, 24], estado: "ACTIVA" }, 8),
    inscripcion(23, { id_alumno: 23, id_plan: 2, id_profesora: 3, ids_horarios: [28, 30], estado: "ACTIVA" }, 15),
    inscripcion(24, { id_alumno: 24, id_plan: 3, id_profesora: 1, ids_horarios: [1, 3], estado: "ACTIVA" }, 5),
    inscripcion(25, { id_alumno: 25, id_plan: 1, id_profesora: 2, ids_horarios: [22, 24], estado: "ACTIVA" }, 12),
    // Alumnos ausentes sincronizados con US-22
    inscripcion(26, { id_alumno: 26, id_plan: 3, id_profesora: 2, ids_horarios: [22, 24], estado: "ACTIVA" }, 12),
    inscripcion(27, { id_alumno: 27, id_plan: 2, id_profesora: 1, ids_horarios: [1, 3], estado: "ACTIVA" }, 10),
  ];
}

function pagoConfirmado(id_pago: number, id_inscripcion: number, monto: number, diasAtras = 0): PagoMock {
  const fecha = diasAtras > 0 ? new Date(Date.now() - diasAtras * UN_DIA_EN_MS).toISOString() : VIGENCIA_PRECIOS;
  return {
    id_pago,
    id_cuota: id_pago,
    id_inscripcion,
    forma_pago: "EFECTIVO",
    estado: "CONFIRMADO",
    monto,
    fecha_pago: fecha,
    titular_cuenta_origen: null,
    fecha_hora_transferencia: null,
    id_usuario_registra: 1,
    id_profesora_cobra: null,
    rendido: true,
    fecha_rendicion: null,
    id_usuario_confirma: 1,
    fecha_confirmacion: fecha,
    motivo_rechazo: null,
    observaciones: null,
  };
}

const UNA_HORA_EN_MS = 3_600_000;

// Efectivo que cobró la profesora a cargo y todavía no rindió (US-19): lo muestra el resumen diario
// (US-26). Como en la base local: $ 30.000 de Valentina Herrera, cobrados hace 7 días.
function cobroSinRendir(id_pago: number, id_inscripcion: number, monto: number, id_profesora_cobra: number, diasAtras: number): PagoMock {
  const fecha = new Date(Date.now() - diasAtras * UN_DIA_EN_MS).toISOString();
  return {
    ...pagoConfirmado(id_pago, id_inscripcion, monto),
    fecha_pago: fecha,
    fecha_confirmacion: fecha,
    id_profesora_cobra,
    rendido: false,
  };
}

interface DatosTransferencia {
  id_pago: number;
  id_inscripcion: number;
  monto: number;
  /** Hace cuántas horas la informó el alumno: con eso se miden las 24 horas (US-17). */
  horasDesdeLaCarga: number;
  titular_cuenta_origen?: string;
  observaciones?: string;
}

// Transferencia que informó el alumno (US-16): queda PENDIENTE hasta que la revise la propietaria.
function transferenciaPendiente(datos: DatosTransferencia): PagoMock {
  const cargada = Date.now() - datos.horasDesdeLaCarga * UNA_HORA_EN_MS;
  return {
    id_pago: datos.id_pago,
    id_cuota: datos.id_pago,
    id_inscripcion: datos.id_inscripcion,
    forma_pago: "TRANSFERENCIA",
    estado: "PENDIENTE",
    monto: datos.monto,
    fecha_pago: new Date(cargada).toISOString(),
    titular_cuenta_origen: datos.titular_cuenta_origen ?? null,
    // El alumno la informa un rato después de hacerla.
    fecha_hora_transferencia: new Date(cargada - UNA_HORA_EN_MS).toISOString(),
    id_usuario_registra: 1,
    id_profesora_cobra: null,
    rendido: true,
    fecha_rendicion: null,
    id_usuario_confirma: null,
    fecha_confirmacion: null,
    motivo_rechazo: null,
    observaciones: datos.observaciones ?? null,
  };
}

function transferenciaResuelta(datos: DatosTransferencia, resolucion: Pick<PagoMock, "estado" | "motivo_rechazo">): PagoMock {
  const pendiente = transferenciaPendiente(datos);
  const resuelta = new Date(new Date(pendiente.fecha_pago).getTime() + 6 * UNA_HORA_EN_MS).toISOString();
  return { ...pendiente, ...resolucion, id_usuario_confirma: 1, fecha_confirmacion: resuelta };
}

// US-17: una por cada tramo del plazo (más de 24 h, entre 12 y 24 h, menos de 12 h), una con un
// monto distinto del precio vigente, una primera cuota (da el alta definitiva al aprobarla) y dos
// ya resueltas. Valentina (3) también tiene una rechazada: no cuenta como cuota paga.
function transferenciasSemilla(): PagoMock[] {
  return [
    transferenciaPendiente({ id_pago: 8, id_inscripcion: 3, monto: PRECIOS[1], horasDesdeLaCarga: 26, titular_cuenta_origen: "Herrera Valentina" }),
    transferenciaPendiente({
      id_pago: 9,
      id_inscripcion: 4,
      monto: 22000,
      horasDesdeLaCarga: 15,
      observaciones: "Te transferí desde la cuenta de mi hermana. Faltan $3.000, te los llevo en efectivo.",
    }),
    transferenciaPendiente({ id_pago: 10, id_inscripcion: 1, monto: PRECIOS[0], horasDesdeLaCarga: 3, observaciones: "Es mi primera cuota." }),
    transferenciaResuelta({ id_pago: 11, id_inscripcion: 4, monto: PRECIOS[0], horasDesdeLaCarga: 50 }, { estado: "CONFIRMADO", motivo_rechazo: null }),
    transferenciaResuelta(
      { id_pago: 12, id_inscripcion: 3, monto: PRECIOS[1], horasDesdeLaCarga: 74 },
      { estado: "RECHAZADO", motivo_rechazo: "No se encontró la transferencia en el extracto" },
    ),
  ];
}

// Cada pago cubre un mes (mocks/situacion-cuota.ts): la inscripción 3 pagó uno de los dos meses que
// lleva y está vencida, la 4 pagó todos y está al día, y Micaela (5) se fue debiendo (US-08).
export function pagosSemilla(): PagoMock[] {
  return [
    cobroSinRendir(1, 3, PRECIOS[1], 1, 7),
    cobroSinRendir(101, 12, PRECIOS[0], 2, 3),
    cobroSinRendir(102, 14, PRECIOS[3], 1, 16),
    ...[2, 3, 4].map((id) => pagoConfirmado(id, 4, PRECIOS[0])),
    ...[5, 6, 7].map((id) => pagoConfirmado(id, 5, PRECIOS[1])),
    ...transferenciasSemilla(),

    // Pagos de las 15 inscripciones demo
    pagoConfirmado(111, 11, PRECIOS[2]),
    pagoConfirmado(112, 12, PRECIOS[0]),
    pagoConfirmado(113, 13, PRECIOS[1]),
    pagoConfirmado(114, 14, PRECIOS[3]),
    pagoConfirmado(115, 15, PRECIOS[0]),

    pagoConfirmado(116, 16, PRECIOS[1]),
    pagoConfirmado(117, 17, PRECIOS[3]),
    pagoConfirmado(118, 18, PRECIOS[0]),
    pagoConfirmado(119, 19, PRECIOS[2]),
    pagoConfirmado(120, 20, PRECIOS[1]),

    pagoConfirmado(121, 21, PRECIOS[3], 10),
    pagoConfirmado(122, 22, PRECIOS[0], 8),
    pagoConfirmado(123, 23, PRECIOS[1], 15),
    pagoConfirmado(124, 24, PRECIOS[2], 5),
    pagoConfirmado(125, 25, PRECIOS[0], 12),
    pagoConfirmado(126, 26, PRECIOS[2], 12),
    pagoConfirmado(127, 27, PRECIOS[1], 10),
  ];
}
