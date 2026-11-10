import { z } from "zod";

// Acepta formato ISO con zona horaria o fecha con Z
const fechaApiSchema = z.string();

const contactoSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
});

export const estadoGestionInactividadSchema = z.enum([
  "PENDIENTE",
  "CONTACTADO",
  "GESTIONADO",
  "IGNORADO",
]);

export type EstadoGestionInactividad = z.infer<typeof estadoGestionInactividadSchema>;

export const alumnoInactivoSchema = z.object({
  id_inscripcion: z.number().int().positive(),
  alumno: contactoSchema.extend({
    id_alumno: z.number().int().positive(),
  }),
  tutor: contactoSchema.nullable(),
  profesora: z.object({
    id_profesora: z.number().int().positive(),
    nombre: z.string(),
    apellido: z.string(),
  }),
  plan: z.object({
    id_plan: z.number().int().positive(),
    nombre: z.string(),
  }),
  estado_cuota: z.enum(["AL_DIA", "POR_VENCER"]),
  inasistencias_consecutivas: z.number().int().nonnegative(),
  fecha_ultima_asistencia: fechaApiSchema.nullable(),
  gestion: z.object({
    estado: estadoGestionInactividadSchema,
    fecha_registro: fechaApiSchema.nullable(),
  }),
});

export type AlumnoInactivo = z.infer<typeof alumnoInactivoSchema>;

export const paginaAlumnosInactivosSchema = z.object({
  datos: z.array(alumnoInactivoSchema),
  total: z.number().int().nonnegative(),
  umbral: z.number().int().positive(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type PaginaAlumnosInactivos = z.infer<typeof paginaAlumnosInactivosSchema>;

export const seguimientoInactividadSchema = z.object({
  id_inscripcion: z.number().int().positive(),
  estado: z.enum(["CONTACTADO", "GESTIONADO", "IGNORADO"]),
  fecha_registro: fechaApiSchema,
  id_usuario_registra: z.number().int().positive(),
});

export type SeguimientoInactividad = z.infer<typeof seguimientoInactividadSchema>;

export interface FiltrosAlumnosInactivos {
  id_profesora?: number;
  id_plan?: number;
  minimo_inasistencias?: number;
  estado_gestion?: EstadoGestionInactividad;
  incluir_ignorados?: boolean;
  limit?: number;
  offset?: number;
}
