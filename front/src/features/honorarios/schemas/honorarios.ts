import { z } from "zod";

// Contrato de US-23: /liquidaciones y /tarifas-honorario (back: gestion-honorarios). Los campos
// marcados "pedido al back" todavía no llegan: son opcionales y la pantalla se arma sin ellos.

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
  usuario: z.object({ nombre: z.string(), apellido: z.string() }),
});

export const liquidacionApiSchema = z.object({
  id_liquidacion: idSchema,
  estado: estadoLiquidacionSchema,
  fecha_liquidacion: z.string(),
  monto_total: montoSchema,
  profesora: profesoraApiSchema,
  // Pedido al back: el desglose de la tarjeta sin pedir el detalle de cada profesora.
  cantidad_alumnos: z.number().int().nonnegative().optional(),
  subtotal_alumnos: montoSchema.optional(),
  subtotal_suplencias: montoSchema.optional(),
});

const centavos = (monto: number) => Math.round(monto * 100);

const informeBaseSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/),
  total_general: montoSchema,
  liquidaciones: z.array(liquidacionApiSchema),
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

// El detalle trae solo el id de la tarifa aplicada: el front la busca en /tarifas-honorario.
const detalleBaseApiSchema = z.object({
  id_liq_detalle: idSchema,
  id_tarifa: idSchema,
  monto: montoSchema,
});

const detalleAlumnoApiSchema = detalleBaseApiSchema.extend({
  concepto: z.literal("ALUMNO_A_CARGO"),
  alumno: z.object({ id_alumno: idSchema, nombre: z.string(), apellido: z.string() }),
  // Pedido al back: plan y situación de la inscripción. Las PREINSCRIPTA nunca llegan al detalle.
  inscripcion: z
    .object({
      estado: z.enum(["ACTIVA", "BAJA"]),
      fecha_baja: z.string().nullable(),
      plan: z.object({ id_plan: idSchema, nombre: z.string() }),
    })
    .optional(),
});

const detalleSuplenciaApiSchema = detalleBaseApiSchema.extend({
  concepto: z.enum(["CLASE_SUPLIDA", "DESCUENTO_AUSENCIA"]),
  clase: z.object({
    fecha_clase: diaSchema,
    hora_inicio: horaSchema,
    hora_fin: horaSchema,
    actividad: z.string(),
    // Pedido al back: quién faltó (la titular del horario) y quién dictó la clase.
    profesora_titular: profesoraApiSchema.optional(),
    profesora_suplente: profesoraApiSchema.optional(),
  }),
});

export const detalleLiquidacionApiSchema = z.discriminatedUnion("concepto", [detalleAlumnoApiSchema, detalleSuplenciaApiSchema]);

// RNF-01, por profesora: monto_total es la suma de sus detalles.
export const liquidacionDetalleApiSchema = liquidacionApiSchema
  .extend({ detalles: z.array(detalleLiquidacionApiSchema) })
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
  tipo_valor: tipoValorTarifaSchema,
  valor: montoSchema,
  fecha_vigencia_desde: diaSchema,
  fecha_vigencia_hasta: diaSchema.nullable(),
});

export type InformeHonorariosApi = z.infer<typeof informeHonorariosApiSchema>;
export type LiquidacionApi = z.infer<typeof liquidacionApiSchema>;
export type LiquidacionDetalleApi = z.infer<typeof liquidacionDetalleApiSchema>;
export type ProfesoraApi = z.infer<typeof profesoraApiSchema>;
export type TarifaHonorarioApi = z.infer<typeof tarifaHonorarioApiSchema>;

/** Cuerpo de POST /tarifas-honorario. */
export interface RegistrarTarifaBody {
  id_profesora: number;
  concepto: z.infer<typeof conceptoTarifaSchema>;
  /** Por ahora el formulario solo carga tarifas para todos los planes. */
  id_plan: null;
  tipo_valor: z.infer<typeof tipoValorTarifaSchema>;
  valor: number;
  /** AAAA-MM-DD, desde hoy en adelante: el back no acepta vigencias en el pasado. */
  fecha_vigencia_desde: string;
}
