import { z } from "../../../shared/utils/zod.js";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";

export const claseIdParamSchema = z.object({ id: idDesdeTextoSchema });

// Para corregir clases pasadas: una clase futura todavía no tiene nada que corregir.
export const listarClasesQuerySchema = z.object({
  fecha: z
    .string({
      error: (issue) =>
        issue.input === undefined ? "Indique la fecha" : "La fecha debe tener formato AAAA-MM-DD",
    })
    .date("La fecha debe tener formato AAAA-MM-DD")
    .transform((valor) => new Date(`${valor}T00:00:00Z`))
    .refine((fecha) => fecha <= fechaActualArgentina(), { message: "La fecha no puede ser futura" }),
});
