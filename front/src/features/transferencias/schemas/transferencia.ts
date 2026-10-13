import { z } from "zod";
import type { EstadoTransferencia } from "@/types/transferencia";

export type { EstadoTransferencia };

export interface DatosBancarios {
  banco: string;
  cbu: string;
  alias: string;
  titular: string;
  cuit: string;
}

export interface SituacionCuotaAlumno {
  estado: "AL_DIA" | "EN_GRACIA" | "VENCIDA";
  fecha_vencimiento: string;
  dias_restantes: number;
  puede_asistir: boolean;
  monto: number;
  tiene_transferencia_pendiente: boolean;
  transferencia_pendiente: {
    id_pago: number;
    monto: number;
    fecha_hora_transferencia: string | null;
    fecha_pago: string;
  } | null;
}

export interface MiPlanRespuesta {
  alumno: {
    id_alumno: number;
    nombre: string;
    apellido: string;
    dni: string | null;
  };
  inscripcion: {
    id_inscripcion: number;
    id_plan: number;
    nombre_plan: string;
    estado: "PREINSCRIPTA" | "ACTIVA" | "BAJA";
    precio: number;
    clases_por_semana: number | null;
    nombre_profesora: string;
  } | null;
  situacion_cuota: SituacionCuotaAlumno | null;
  datos_bancarios: DatosBancarios;
}

export const informarTransferenciaFormSchema = z.object({
  id_inscripcion: z.number({ required_error: "Inscripción no válida" }).int().positive(),
  monto: z
    .number({ required_error: "Ingresá el monto de la transferencia" })
    .positive("El monto debe ser mayor a 0")
    .max(99_999_999.99, "El monto no puede superar $99.999.999"),
  fecha_hora_transferencia: z
    .string({ required_error: "Ingresá cuándo hiciste la transferencia" })
    .min(1, "Ingresá cuándo hiciste la transferencia")
    .refine((val) => !isNaN(new Date(val).getTime()), "Fecha y hora inválida")
    .refine((val) => new Date(val) <= new Date(), "La transferencia no puede ser futura"),
  titular_cuenta_origen: z
    .string()
    .trim()
    .max(80, "El nombre del titular no puede tener más de 80 caracteres")
    .optional()
    .or(z.literal("")),
  observaciones: z
    .string()
    .trim()
    .max(255, "Las observaciones no pueden tener más de 255 caracteres")
    .optional()
    .or(z.literal("")),
});

export type InformarTransferenciaFormData = z.infer<typeof informarTransferenciaFormSchema>;

// Contrato de US-17 (back: pago.routes.ts, pago.schemas.ts y TransferenciaEnRevision en pago.types.ts).

// pagos.monto es NUMERIC(10,2): el back lo pasa a number, pero se acepta texto por si cambia.
const montoApiSchema = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine(Number.isFinite, { message: "Monto inválido" });

export const estadoTransferenciaApiSchema = z.enum(["PENDIENTE", "CONFIRMADO", "RECHAZADO"]);

// Columnas usadas en revisión y en listado de alumno
export const transferenciaApiSchema = z.object({
  id_pago: z.number().int(),
  id_cuota: z.number().int().optional(),
  id_inscripcion: z.number().int().optional(),
  forma_pago: z.enum(["TRANSFERENCIA", "EFECTIVO"]).optional().default("TRANSFERENCIA"),
  estado: estadoTransferenciaApiSchema,
  monto: montoApiSchema,
  fecha_pago: z.string(),
  fecha_hora_transferencia: z.string().nullable(),
  titular_cuenta_origen: z.string().nullable(),
  observaciones: z.string().nullable(),
  fecha_confirmacion: z.string().nullable().optional(),
  motivo_rechazo: z.string().nullable(),
  alumno: z.object({ id_alumno: z.number().int(), nombre: z.string(), apellido: z.string() }),
  horas_desde_la_carga: z.number().int().nonnegative().optional(),
  supera_24_horas: z.boolean().optional(),
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
