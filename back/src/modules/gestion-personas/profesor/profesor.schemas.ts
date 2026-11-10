import { z } from "../../../shared/utils/zod.js";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { textoOpcionalSchema } from "../../../shared/utils/esquemas-texto.js";

export const crearProfesoraSchema = z.object({
  id_usuario: idSchema,
  especialidad: textoOpcionalSchema(80).optional(),
});

export const actualizarProfesoraSchema = z
  .object({
    especialidad: textoOpcionalSchema(80).optional(),
    reactivar: z.literal(true).optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const profesoraIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export type CrearProfesoraInput = z.infer<typeof crearProfesoraSchema>;
export type ActualizarProfesoraInput = z.infer<typeof actualizarProfesoraSchema>;
