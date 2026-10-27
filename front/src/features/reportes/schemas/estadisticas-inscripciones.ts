import { z } from "zod";

// Contrato de US-35: GET /reportes/inscripciones (back: reportes/generador-informes, en dev).

const enteroSchema = z.number().int().nonnegative();
const mesSchema = z.number().int().min(1).max(12);

const mesPicoApiSchema = z.object({ mes: mesSchema, anio: z.number().int(), nombre_mes: z.string(), cantidad: enteroSchema });

export const estadisticasInscripcionesApiSchema = z.object({
  periodo: z.object({ desde: z.string(), hasta: z.string(), anio: z.number().int().nullable() }),
  resumen: z.object({
    total_altas: enteroSchema,
    promedio_mensual: z.number(),
    mes_pico: mesPicoApiSchema.nullable(),
  }),
  meses: z.array(
    z.object({
      mes: mesSchema,
      anio: z.number().int(),
      nombre_mes: z.string(),
      cantidad: enteroSchema,
      diferencia_mes_anterior: z.number().int().nullable(),
      porcentaje_variacion: z.number().nullable(),
    }),
  ),
});

export type EstadisticasInscripcionesApi = z.infer<typeof estadisticasInscripcionesApiSchema>;
