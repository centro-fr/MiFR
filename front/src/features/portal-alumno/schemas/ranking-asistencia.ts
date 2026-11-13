import { z } from "zod";

export const rankingAsistenciaSchema = z.object({
  periodo: z.object({
    desde: z.string(),
    hasta: z.string(),
  }),
  actividad: z.number().int().positive().nullable(),
  minimo_clases: z.number().int().positive(),
  datos: z.array(
    z.object({
      posicion: z.number().int().positive(),
      id_alumno: z.number().int().positive(),
      nombre: z.string(),
      apellido: z.string(),
      porcentaje_asistencia: z.number().min(0).max(100),
      clases_previstas: z.number().int().positive(),
      clases_asistidas: z.number().int().nonnegative(),
      racha_actual: z.number().int().nonnegative(),
      insignias: z.array(
        z.object({
          codigo: z.string(),
          nombre: z.string(),
          descripcion: z.string().nullable(),
          tipo: z.enum(["MES_PERFECTO", "RACHA", "TOTAL_CLASES", "PODIO_MES"]),
          valor_umbral: z.number().int().positive(),
        }),
      ),
      es_propia: z.boolean(),
    }),
  ),
  propias: z.array(z.object({
    posicion: z.number().int().positive(),
    id_alumno: z.number().int().positive(),
    nombre: z.string(),
    apellido: z.string(),
    porcentaje_asistencia: z.number().min(0).max(100),
    clases_previstas: z.number().int().positive(),
    clases_asistidas: z.number().int().nonnegative(),
    racha_actual: z.number().int().nonnegative(),
    insignias: z.array(z.object({
      codigo: z.string(),
      nombre: z.string(),
      descripcion: z.string().nullable(),
      tipo: z.enum(["MES_PERFECTO", "RACHA", "TOTAL_CLASES", "PODIO_MES"]),
      valor_umbral: z.number().int().positive(),
    })),
    es_propia: z.boolean(),
  })),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type RankingAsistencia = z.infer<typeof rankingAsistenciaSchema>;
