import { z } from "../../../shared/utils/zod.js";
import { fechaSchema } from "../../../shared/utils/esquemas-fecha.js";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import { paginacionSchema } from "../../../shared/utils/esquemas-paginacion.js";

export const alumnoInsigniasParamsSchema = z.object({ id: idDesdeTextoSchema });

// Los nombres de la query son los acordados en SPRINT-5.md: ?desde&hasta&actividad.
export const rankingAsistenciaQuerySchema = z
  .object({
    desde: fechaSchema.optional(),
    hasta: fechaSchema.optional(),
    actividad: idDesdeTextoSchema.optional(),
    ...paginacionSchema(50),
  })
  .refine(({ desde, hasta }) => !desde || !hasta || desde <= hasta, {
    message: "desde no puede ser posterior a hasta",
    path: ["desde"],
  });

export type RankingAsistenciaQuery = z.infer<typeof rankingAsistenciaQuerySchema>;
