import { z } from "../../../shared/utils/zod.js";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import { textoOpcionalSchema } from "../../../shared/utils/esquemas-texto.js";

export const claseYAlumnoParamSchema = z.object({
  id: idDesdeTextoSchema,
  idAlumno: idDesdeTextoSchema,
});

// Sin observaciones se conservan las que había; "" las borra (asistencias.observaciones, VARCHAR(255)).
export const marcarAsistenciaSchema = z.object({
  asistio: z.boolean(),
  observaciones: textoOpcionalSchema(255, { multilinea: true }).optional(),
});

export type MarcarAsistenciaHttpInput = z.infer<typeof marcarAsistenciaSchema>;
