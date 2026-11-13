import { z } from "zod";

// GET /alumnos/:id/asistencias (alumno.openapi.ts del back, US-10): el historial de la ficha, de a
// 10 marcas, de la clase más reciente a la más vieja. `presentes` y `ausentes` cuentan todo el
// historial, no solo la página.
export const registroAsistenciaAlumnoSchema = z.object({
  id_clase: z.number().int(),
  fecha: z.string(),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  actividad: z.string(),
  profesora: z.string(),
  asistio: z.boolean(),
  observaciones: z.string().nullable(),
});

export type RegistroAsistenciaAlumno = z.infer<typeof registroAsistenciaAlumnoSchema>;

export const paginaAsistenciasAlumnoSchema = z.object({
  datos: z.array(registroAsistenciaAlumnoSchema),
  total: z.number().int(),
  presentes: z.number().int(),
  ausentes: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type PaginaAsistenciasAlumno = z.infer<typeof paginaAsistenciasAlumnoSchema>;

export type FiltroAsistencia = "TODAS" | "PRESENTES" | "AUSENTES";
