import { z } from "zod";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";

export const claseYAlumnoParamSchema = z.object({
  id: idDesdeTextoSchema,
  idAlumno: idDesdeTextoSchema,
});

export const marcarAsistenciaSchema = z.object({ asistio: z.boolean() });

export type MarcarAsistenciaHttpInput = z.infer<typeof marcarAsistenciaSchema>;
