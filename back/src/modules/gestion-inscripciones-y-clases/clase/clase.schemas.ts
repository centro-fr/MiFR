import { z } from "zod";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";

export const claseIdParamSchema = z.object({ id: idDesdeTextoSchema });
