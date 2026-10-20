import { z } from "zod";

// Contrato de US-23 (back: gestion-honorarios, todavía sin endpoints). Sale de lo planeado en
// back/SPRINT-4.md, del DER (liquidaciones, liquidacion_detalles, tarifas_honorario) y de los tipos
// de CalculadorHonorarios. Si el back cambia algo, se ajusta acá y en el mapeo de la API.

// NUMERIC del DER: el back lo suele pasar a number, pero Prisma serializa Decimal como texto.
const montoSchema = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine(Number.isFinite, { message: "Monto inválido" });

// DATE viaja como medianoche UTC ("2026-10-01T00:00:00.000Z") o como AAAA-MM-DD.
const diaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha inválida")
  .transform((valor) => valor.slice(0, 10));

// TIME viaja sobre el 1970-01-01 en UTC ("1970-01-01T18:00:00.000Z") o como HH:mm.
const horaSchema = z
  .string()
  .regex(/^(?:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/, "Hora inválida")
  .transform((valor) => (valor.includes("T") ? valor.slice(11, 16) : valor.slice(0, 5)));

const idSchema = z.number().int().positive();

export const estadoLiquidacionSchema = z.enum(["BORRADOR", "CERRADA", "PAGADA"]);
export const conceptoTarifaSchema = z.enum(["ALUMNO_A_CARGO", "HORA_SUPLENCIA"]);
export const tipoValorTarifaSchema = z.enum(["PORCENTAJE", "MONTO_FIJO"]);

const profesoraApiSchema = z.object({
  id_profesora: idSchema,
  nombre: z.string(),
  apellido: z.string(),
});

export const liquidacionResumenApiSchema = z.object({
  id_liquidacion: idSchema,
  estado: estadoLiquidacionSchema,
  fecha_liquidacion: z.string(),
  monto_total: montoSchema,
  profesora: profesoraApiSchema,
  cantidad_alumnos: z.number().int().nonnegative(),
  subtotal_alumnos: montoSchema,
  subtotal_suplencias: montoSchema,
});

const centavos = (monto: number) => Math.round(monto * 100);

const informeBaseSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/),
  periodo_desde: diaSchema,
  periodo_hasta: diaSchema,
  total_general: montoSchema,
  liquidaciones: z.array(liquidacionResumenApiSchema),
});

// RNF-01: el total general tiene que ser la suma de las liquidaciones. Si no coincide, el informe
// no se muestra: un total financiero inconsistente es peor que un error visible.
function totalCoincide({ total_general, liquidaciones }: z.infer<typeof informeBaseSchema>): boolean {
  return centavos(total_general) === liquidaciones.reduce((suma, fila) => suma + centavos(fila.monto_total), 0);
}

const TOTAL_INCONSISTENTE = {
  message: "El total general no coincide con la suma de las liquidaciones",
  path: ["total_general"],
};

export const informeHonorariosApiSchema = informeBaseSchema.refine(totalCoincide, TOTAL_INCONSISTENTE);

export const advertenciaApiSchema = z.object({
  id_profesora: idSchema,
  concepto: conceptoTarifaSchema,
  motivo: z.enum(["SIN_TARIFA", "TARIFA_NO_APLICABLE"]),
  id_inscripcion: idSchema.nullable(),
  id_clase: idSchema.nullable(),
});

// POST /liquidaciones: el mismo informe más lo que no se pudo calcular (no se guarda en la base).
export const resultadoCalculoApiSchema = informeBaseSchema
  .extend({ advertencias: z.array(advertenciaApiSchema) })
  .refine(totalCoincide, TOTAL_INCONSISTENTE);

const tarifaAplicadaApiSchema = z.object({
  id_tarifa: idSchema,
  tipo_valor: tipoValorTarifaSchema,
  valor: montoSchema,
});

const detalleAlumnoApiSchema = z.object({
  id_liq_detalle: idSchema,
  concepto: z.literal("ALUMNO_A_CARGO"),
  monto: montoSchema,
  tarifa: tarifaAplicadaApiSchema,
  inscripcion: z.object({
    id_inscripcion: idSchema,
    // Las PREINSCRIPTA no generan honorarios: nunca llegan al detalle.
    estado: z.enum(["ACTIVA", "BAJA"]),
    fecha_baja: z.string().nullable(),
    alumno: z.object({ id_alumno: idSchema, nombre: z.string(), apellido: z.string() }),
    plan: z.object({ id_plan: idSchema, nombre: z.string() }),
  }),
  clase: z.null(),
});

const detalleSuplenciaApiSchema = z.object({
  id_liq_detalle: idSchema,
  concepto: z.enum(["CLASE_SUPLIDA", "DESCUENTO_AUSENCIA"]),
  monto: montoSchema,
  tarifa: tarifaAplicadaApiSchema,
  inscripcion: z.null(),
  clase: z.object({
    id_clase: idSchema,
    fecha_clase: diaSchema,
    hora_inicio: horaSchema,
    hora_fin: horaSchema,
    actividad: z.object({ id_actividad: idSchema, nombre: z.string() }),
    profesora_ausente: profesoraApiSchema,
    profesora_suplente: profesoraApiSchema,
  }),
});

export const detalleLiquidacionApiSchema = z.discriminatedUnion("concepto", [detalleAlumnoApiSchema, detalleSuplenciaApiSchema]);

// RNF-01, por profesora: monto_total es la suma de sus detalles.
export const liquidacionDetalleApiSchema = z
  .object({
    id_liquidacion: idSchema,
    estado: estadoLiquidacionSchema,
    monto_total: montoSchema,
    profesora: profesoraApiSchema,
    detalles: z.array(detalleLiquidacionApiSchema),
  })
  .refine(
    ({ monto_total, detalles }) =>
      centavos(monto_total) === detalles.reduce((suma, detalle) => suma + centavos(detalle.monto), 0),
    { message: "El total de la liquidación no coincide con la suma de sus detalles", path: ["monto_total"] },
  );

export const tarifaHonorarioApiSchema = z.object({
  id_tarifa: idSchema,
  id_profesora: idSchema,
  concepto: conceptoTarifaSchema,
  id_plan: idSchema.nullable(),
  plan: z.object({ id_plan: idSchema, nombre: z.string() }).nullable(),
  tipo_valor: tipoValorTarifaSchema,
  valor: montoSchema,
  fecha_vigencia_desde: diaSchema,
  fecha_vigencia_hasta: diaSchema.nullable(),
});

export type InformeHonorariosApi = z.infer<typeof informeHonorariosApiSchema>;
export type LiquidacionResumenApi = z.infer<typeof liquidacionResumenApiSchema>;
export type LiquidacionDetalleApi = z.infer<typeof liquidacionDetalleApiSchema>;
export type ResultadoCalculoApi = z.infer<typeof resultadoCalculoApiSchema>;
export type TarifaHonorarioApi = z.infer<typeof tarifaHonorarioApiSchema>;

/** Cuerpo de POST /tarifas-honorario. */
export interface RegistrarTarifaBody {
  id_profesora: number;
  concepto: z.infer<typeof conceptoTarifaSchema>;
  /** Por ahora el formulario solo carga tarifas para todos los planes. */
  id_plan: null;
  tipo_valor: z.infer<typeof tipoValorTarifaSchema>;
  valor: number;
  fecha_vigencia_desde: string;
}
