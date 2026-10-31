import { z } from "zod";
import type { CodigoMedida } from "@/features/rutinas/schemas/medidas";

// Contrato de US-27 (back: gestion-rutinas-y-progreso): /rutinas, /progreso y sus listados por alumno.

const idSchema = z.number().int().positive();

// DATE viaja como medianoche UTC ("2026-10-01T00:00:00.000Z") o como AAAA-MM-DD.
const diaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha inválida")
  .transform((valor) => valor.slice(0, 10));

const ejercicioApiSchema = z.object({
  nombre: z.string(),
  series: z.number().int().positive(),
  repeticiones: z.string(),
  notas: z.string().nullable(),
});

const contenidoApiSchema = z.object({
  dias: z.array(z.object({ nombre: z.string(), ejercicios: z.array(ejercicioApiSchema) })),
});

export const rutinaApiSchema = z.object({
  id_rutina: idSchema,
  id_profesora: idSchema,
  nombre: z.string(),
  fecha_desde: diaSchema,
  fecha_hasta: diaSchema.nullable(),
  contenido: contenidoApiSchema,
  observaciones: z.string().nullable(),
  activa: z.boolean(),
});

// NUMERIC(6,2): el back lo entrega como number. El default de fecha_modificacion tolera un back anterior a
// las correcciones: sin él, el historial dejaría de cargar en vez de solo no marcar las corregidas.
export const medicionApiSchema = z.object({
  id_registro: idSchema,
  id_profesora: idSchema,
  fecha: diaSchema,
  observaciones: z.string().nullable(),
  fecha_modificacion: z.string().nullable().default(null),
  medidas: z.array(z.object({ codigo: z.string(), unidad: z.string(), valor: z.number() })),
});

// US-28: contrato pedido al back en un issue (todavía no existe). Si lo define distinto, se adapta acá.
export const miAlumnoApiSchema = z.object({
  id_alumno: idSchema,
  nombre: z.string(),
  apellido: z.string(),
  estado: z.enum(["ACTIVO", "INACTIVO", "BAJA"]),
  propio: z.boolean(),
});

export type RutinaApi = z.infer<typeof rutinaApiSchema>;
export type MedicionApi = z.infer<typeof medicionApiSchema>;

/**
 * Cuerpo de POST /rutinas. Sin id_profesora: la profesora carga siempre a su nombre y la propietaria,
 * como también es profesora, queda con el suyo.
 */
export interface CrearRutinaBody {
  id_alumno: number;
  nombre: string;
  /** AAAA-MM-DD. */
  fecha_desde: string;
  fecha_hasta: string | null;
  contenido: {
    dias: { nombre: string; ejercicios: { nombre: string; series: number; repeticiones: string; notas: string | null }[] }[];
  };
  observaciones: string | null;
}

/** Cuerpo de POST /progreso. La unidad la pone el back según el código. */
export interface RegistrarMedicionBody {
  id_alumno: number;
  /** AAAA-MM-DD, hoy o antes. */
  fecha: string;
  observaciones: string | null;
  medidas: { codigo: CodigoMedida; valor: number }[];
}

/**
 * Cuerpo de PATCH /progreso/:id. Va completo aunque el back acepte uno parcial: las medidas reemplazan a
 * todas las anteriores y observaciones en null la borra, así queda exactamente lo que se ve en el formulario.
 */
export type CorregirMedicionBody = Omit<RegistrarMedicionBody, "id_alumno">;
