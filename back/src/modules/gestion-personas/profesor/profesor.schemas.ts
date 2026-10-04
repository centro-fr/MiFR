import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";

export const crearProfesoraSchema = z.object({
  id_usuario: idSchema,
  especialidad: z.string().trim().max(80).optional(),
});

export const profesoraIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export type CrearProfesoraInput = z.infer<typeof crearProfesoraSchema>;
