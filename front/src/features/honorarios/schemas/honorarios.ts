import { z } from "zod";

// Contrato de US-23: /liquidaciones y /tarifas-honorario (back: gestion-honorarios). Los campos
// marcados "desglose" se agregaron en el back después (dc36b4f): son opcionales para que un back
// anterior no deje la pantalla en blanco, que se arma igual sin ellos.

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
  // Desglose: lo que muestra la tarjeta sin pedir el detalle de cada profesora. subtotal_suplencias
  // es el neto de CLASE_SUPLIDA y DESCUENTO_AUSENCIA, así que puede ser negativo.
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
  actividad: z.string().optional(),
  // Desglose: plan y situación de la inscripción. Las PREINSCRIPTA nunca llegan al detalle.
  inscripcion: z
    .object({
      estado: z.enum(["ACTIVA", "BAJA"]),
      fecha_baja: z.string().nullable(),
      plan: z.object({ id_plan: idSchema, nombre: z.string() }),
      actividad: z.string().optional(),
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
    // Desglose: quién faltó y quién dictó la clase. La titular sale de la suplencia registrada, así que
    // llega en null si la suplencia se eliminó con la liquidación todavía en borrador.
    profesora_titular: profesoraApiSchema.nullish(),
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

// El porcentaje por alumno es uno solo para todo el estudio (id_profesora null) y la hora de suplencia,
// una por profesora. Pedido al back: hoy toda tarifa lleva profesora, así que el porcentaje general lo
// usa solo el mock.
export const tarifaHonorarioApiSchema = z.object({
  id_tarifa: idSchema,
  id_profesora: idSchema.nullable(),
  concepto: conceptoTarifaSchema,
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

/**
 * Cuerpo de POST /tarifas-honorario. El tipo lo fija el concepto: por alumno, un porcentaje de lo cobrado
 * (mayor a 0 y hasta 100); por hora de suplencia, ARS por hora. La vigencia es AAAA-MM-DD, desde hoy en
 * adelante, y la nueva cierra la vigente del mismo alcance el día anterior.
 */
export type RegistrarTarifaBody =
  | { concepto: "ALUMNO_A_CARGO"; tipo_valor: "PORCENTAJE"; valor: number; fecha_vigencia_desde: string }
  | { concepto: "HORA_SUPLENCIA"; id_profesora: number; tipo_valor: "MONTO_FIJO"; valor: number; fecha_vigencia_desde: string };
