import { z } from "zod";

export type EstadoTransferencia = "PENDIENTE" | "CONFIRMADO" | "RECHAZADO";

export interface TransferenciaApi {
  id_pago: number;
  id_cuota: number;
  id_inscripcion: number;
  forma_pago: "TRANSFERENCIA" | "EFECTIVO";
  estado: EstadoTransferencia;
  monto: number;
  fecha_pago: string;
  fecha_hora_transferencia: string | null;
  titular_cuenta_origen: string | null;
  observaciones: string | null;
  motivo_rechazo: string | null;
  alumno: {
    id_alumno: number;
    nombre: string;
    apellido: string;
  };
}

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
