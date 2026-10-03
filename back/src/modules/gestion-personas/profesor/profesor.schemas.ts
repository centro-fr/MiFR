import { z } from "zod";

export const crearProfesoraSchema = z.object({
  id_usuario: z.number().int().positive(),
  especialidad: z.string().trim().max(80).optional(),
});

export const profesoraIdParamSchema = z.object({
  id: z.coerce.number().int().positive("id inválido"),
});

export type CrearProfesoraInput = z.infer<typeof crearProfesoraSchema>;
