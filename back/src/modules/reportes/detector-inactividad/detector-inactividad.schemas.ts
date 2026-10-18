import { z } from "zod";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import { paginacionSchema } from "../../../shared/utils/esquemas-paginacion.js";

const ESTADOS_SEGUIMIENTO = ["CONTACTADO", "GESTIONADO", "IGNORADO"] as const;

export const listarAlumnosInactivosQuerySchema = z.object({
  id_profesora: idDesdeTextoSchema.optional(),
  id_plan: idDesdeTextoSchema.optional(),
  // Llega como texto: solo dígitos antes de convertir (validaciones.md). El tope es el del parámetro.
  minimo_inasistencias: z
    .string()
    .regex(/^\d{1,2}$/, "minimo_inasistencias inválido")
    .transform(Number)
    .pipe(z.number().int().min(1).max(30))
    .optional(),
  estado_gestion: z.enum(["PENDIENTE", ...ESTADOS_SEGUIMIENTO]).optional(),
  ...paginacionSchema(50),
});

export const seguimientoParamSchema = z.object({ idInscripcion: idDesdeTextoSchema });

export const registrarSeguimientoSchema = z.object({ estado: z.enum(ESTADOS_SEGUIMIENTO) });

export type ListarAlumnosInactivosQuery = z.infer<typeof listarAlumnosInactivosQuerySchema>;
export type RegistrarSeguimientoInput = z.infer<typeof registrarSeguimientoSchema>;
