import { z } from "zod";
import { fechaSchema } from "../../../shared/utils/esquemas-fecha.js";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import { paginacionSchema } from "../../../shared/utils/esquemas-paginacion.js";

const RANGO_FECHAS_INVALIDO = {
  message: "desde no puede ser posterior a hasta",
  path: ["desde"],
};

function fechasEnOrden({ desde, hasta }: { desde?: Date; hasta?: Date }): boolean {
  return !desde || !hasta || desde <= hasta;
}

export const informeCuotasVencidasQuerySchema = z
  .object({
    desde: fechaSchema.optional(),
    hasta: fechaSchema.optional(),
    id_profesora: idDesdeTextoSchema.optional(),
    id_alumno: idDesdeTextoSchema.optional(),
    id_plan: idDesdeTextoSchema.optional(),
    ...paginacionSchema(50),
  })
  .refine(fechasEnOrden, RANGO_FECHAS_INVALIDO);

export const informeCobranzaQuerySchema = z
  .object({
    desde: fechaSchema.optional(),
    hasta: fechaSchema.optional(),
    forma_pago: z.enum(["EFECTIVO", "TRANSFERENCIA"]).optional(),
    id_profesora: idDesdeTextoSchema.optional(),
    ...paginacionSchema(50),
  })
  .refine(fechasEnOrden, RANGO_FECHAS_INVALIDO);

export const estadisticasPlanesQuerySchema = z.object({
  id_actividad: idDesdeTextoSchema.optional(),
  id_profesora: idDesdeTextoSchema.optional(),
});

export const estadisticasInscripcionesQuerySchema = z
  .object({
    desde: fechaSchema.optional(),
    hasta: fechaSchema.optional(),
    anio: z
      .string()
      .regex(/^\d{4}$/, "anio inválido")
      .transform(Number)
      .pipe(z.number().int().min(2000).max(2100))
      .optional(),
    id_plan: idDesdeTextoSchema.optional(),
    id_profesora: idDesdeTextoSchema.optional(),
  })
  .refine(fechasEnOrden, RANGO_FECHAS_INVALIDO);

export type InformeCuotasVencidasQuery = z.infer<typeof informeCuotasVencidasQuerySchema>;
export type InformeCobranzaQuery = z.infer<typeof informeCobranzaQuerySchema>;
export type EstadisticasPlanesQuery = z.infer<typeof estadisticasPlanesQuerySchema>;
export type EstadisticasInscripcionesQuery = z.infer<typeof estadisticasInscripcionesQuerySchema>;
