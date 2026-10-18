import { z } from "zod";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import { paginacionSchema } from "../../../shared/utils/esquemas-paginacion.js";

export const notificacionParamSchema = z.object({ id: idDesdeTextoSchema });

export const listarNotificacionesQuerySchema = z.object({ ...paginacionSchema(20) });

export type ListarNotificacionesQuery = z.infer<typeof listarNotificacionesQuerySchema>;
