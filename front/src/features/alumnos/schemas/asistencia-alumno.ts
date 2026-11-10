import { z } from "zod";

export const registroAsistenciaAlumnoSchema = z.object({
  id_clase: z.number(),
  fecha: z.string(),
  dia: z.string(),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  actividad: z.string(),
  profesora: z.string(),
  asistio: z.boolean(),
  observaciones: z.string().nullable().optional(),
});

export type RegistroAsistenciaAlumno = z.infer<typeof registroAsistenciaAlumnoSchema>;
