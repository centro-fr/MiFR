import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { textoOpcionalSchema } from "../../../shared/utils/esquemas-texto.js";

export const crearProfesoraSchema = z.object({
  id_usuario: idSchema,
  especialidad: textoOpcionalSchema(80).optional(),
});

export const profesoraIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export type CrearProfesoraInput = z.infer<typeof crearProfesoraSchema>;
