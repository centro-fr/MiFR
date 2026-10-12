import { z } from "zod";

export const seleccionPlanSchema = z.object({
  id_plan: z.number({ required_error: "Debes seleccionar un plan" }).int().positive(),
  id_profesora: z.number({ required_error: "Debes seleccionar una profesora" }).int().positive(),
  ids_horarios: z
    .array(z.number().int().positive())
    .min(1, "Debes seleccionar al menos un horario"),
  sin_cargo: z.boolean().default(false),
  fecha_inicio: z.string().optional(),
  observaciones: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export type SeleccionPlanData = z.infer<typeof seleccionPlanSchema>;
