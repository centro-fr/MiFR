import { z } from "zod";

// Contrato de US-17 (back: pago.routes.ts, pago.schemas.ts y TransferenciaEnRevision en pago.types.ts).

// pagos.monto es NUMERIC(10,2): el back lo pasa a number, pero se acepta texto por si cambia.
const montoApiSchema = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine(Number.isFinite, { message: "Monto inválido" });

export const estadoTransferenciaApiSchema = z.enum(["PENDIENTE", "CONFIRMADO", "RECHAZADO"]);

// Solo las columnas que usa la pantalla: el resto del pago (cuota, rendición) no se muestra.
export const transferenciaApiSchema = z.object({
  id_pago: z.number().int(),
  estado: estadoTransferenciaApiSchema,
  monto: montoApiSchema,
  fecha_pago: z.string(),
  fecha_hora_transferencia: z.string().nullable(),
  titular_cuenta_origen: z.string().nullable(),
  observaciones: z.string().nullable(),
  fecha_confirmacion: z.string().nullable(),
  motivo_rechazo: z.string().nullable(),
  alumno: z.object({ id_alumno: z.number().int(), nombre: z.string(), apellido: z.string() }),
  horas_desde_la_carga: z.number().int().nonnegative(),
  supera_24_horas: z.boolean(),
});

export type TransferenciaApi = z.infer<typeof transferenciaApiSchema>;

// ---------- Rechazo ----------

export const LARGO_MAXIMO_MOTIVO = 255;

// rechazarTransferenciaSchema del back (textoSchema(255), de una línea): se valida igual acá para
// avisar antes de enviar. El motivo lo ve el alumno en "Mis transferencias".
export const motivoRechazoSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un motivo para poder rechazar.")
  .max(LARGO_MAXIMO_MOTIVO, `El motivo puede tener hasta ${LARGO_MAXIMO_MOTIVO} caracteres.`)
  .refine((valor) => !/[\p{Cc}\p{Cf}]/u.test(valor), "El motivo tiene caracteres no permitidos.")
  .refine((valor) => /\p{L}/u.test(valor), "El motivo tiene que tener al menos una letra.");

/** Ejemplos de la spec: se ofrecen como atajos, la propietaria puede escribir otro. */
export const MOTIVOS_FRECUENTES = [
  "No se encontró la transferencia en el extracto",
  "El monto no coincide",
  "La transferencia no se realizó",
] as const;
