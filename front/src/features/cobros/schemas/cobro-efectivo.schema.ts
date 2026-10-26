import { z } from "zod";

/**
 * Esquema de validación del formulario de cobro en efectivo (US-15).
 * Reglas de pago.schemas.ts del backend:
 * - Monto positivo con hasta 2 decimales y máximo 99.999.999,99.
 * - Confirmación obligatoria si el monto difiere del precio vigente.
 * - Observaciones opcionales de hasta 255 caracteres.
 */

const MONTO_MAXIMO = 99_999_999.99;
const FORMATO_MONTO = /^\d{1,8}(?:[.,]\d{1,2})?$/;

/** Monto escrito en el formulario ("25000" o "25000,50"), con las reglas del back. */
export function montoDeCobroSchema(mensajeSiFalta: string) {
  return z
    .string()
    .trim()
    .min(1, mensajeSiFalta)
    .regex(FORMATO_MONTO, "Ingresá un monto válido (ej: 25000 o 25000,50)")
    .refine((val) => {
      const num = Number(val.replace(",", "."));
      return num > 0;
    }, "El monto debe ser mayor a 0")
    .refine((val) => {
      const num = Number(val.replace(",", "."));
      return num <= MONTO_MAXIMO;
    }, "El monto no puede superar $ 99.999.999,99");
}

/** "25000,50" → 25000.5. */
export function montoComoNumero(monto: string): number {
  return Number(monto.trim().replace(",", "."));
}

export const registrarCobroEfectivoFormSchema = z.object({
  idInscripcion: z.number().int().positive("La inscripción es obligatoria"),
  monto: montoDeCobroSchema("Ingresá el monto cobrado"),
  confirmarMontoDistinto: z.boolean().default(false),
  observaciones: z.string().trim().max(255, "Máximo 255 caracteres").optional(),
});

export type RegistrarCobroEfectivoFormValues = z.input<typeof registrarCobroEfectivoFormSchema>;

export interface RegistrarCobroEfectivoBody {
  id_inscripcion: number;
  id_promocion?: number;
  monto: number;
  confirmar_monto_distinto?: boolean;
  observaciones?: string;
}

/** Transforma los valores del formulario al cuerpo esperado por la API (POST /pagos/efectivo). */
export function aCuerpoCobroEfectivo(
  valores: RegistrarCobroEfectivoFormValues,
): RegistrarCobroEfectivoBody {
  return {
    id_inscripcion: valores.idInscripcion,
    monto: Number(valores.monto.trim().replace(",", ".")),
    confirmar_monto_distinto: Boolean(valores.confirmarMontoDistinto),
    observaciones: valores.observaciones?.trim() || undefined,
  };
}

export const pagoApiSchema = z.object({
  id_pago: z.number().int(),
  id_cuota: z.number().int(),
  id_inscripcion: z.number().int().optional(),
  forma_pago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
  estado: z.enum(["PENDIENTE", "CONFIRMADO", "RECHAZADO"]),
  monto: z.number(),
  fecha_pago: z.string(),
  titular_cuenta_origen: z.string().nullable().optional(),
  fecha_hora_transferencia: z.string().nullable().optional(),
  id_usuario_registra: z.number().int(),
  id_profesora_cobra: z.number().int().nullable().optional(),
  rendido: z.boolean(),
  fecha_rendicion: z.string().nullable().optional(),
  id_usuario_confirma: z.number().int().nullable().optional(),
  fecha_confirmacion: z.string().nullable().optional(),
  motivo_rechazo: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
});

export type PagoApi = z.infer<typeof pagoApiSchema>;

export const comprobantePagoSchema = z.object({
  numero: z.number().int(),
  fecha: z.string(),
  forma_pago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
  monto: z.number(),
  alumno: z.object({
    nombre: z.string(),
    apellido: z.string(),
    dni: z.string().nullable(),
  }),
  plan: z.string(),
  cuota: z.object({
    numero: z.number().int(),
    vencimiento: z.string(),
  }),
  registrado_por: z.object({
    nombre: z.string(),
    apellido: z.string(),
  }),
  profesora_cobra: z
    .object({
      nombre: z.string(),
      apellido: z.string(),
    })
    .nullable(),
});

export type ComprobantePago = z.infer<typeof comprobantePagoSchema>;
