import { z } from "zod";

const tipoInsigniaSchema = z.enum(["MES_PERFECTO", "RACHA", "TOTAL_CLASES", "PODIO_MES"]);

const proximoHitoSchema = z.object({
  umbral: z.number().int().positive(),
  faltantes: z.number().int().nonnegative(),
}).nullable();

export const fichaInsigniasSchema = z.object({
  id_alumno: z.number().int().positive(),
  racha: z.object({
    actual: z.number().int().nonnegative(),
    mejor: z.number().int().nonnegative(),
    fecha_inicio: z.string().nullable(),
    proximo_hito: proximoHitoSchema,
  }),
  clases_asistidas: z.number().int().nonnegative(),
  proximo_hito_clases: proximoHitoSchema,
  insignias: z.array(z.object({
    codigo: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    tipo: tipoInsigniaSchema,
    valor_umbral: z.number().int().positive(),
    obtenida: z.boolean(),
    fecha_obtencion: z.string().nullable(),
    periodos: z.array(z.string()),
    progreso: z.object({
      actual: z.number().int().nonnegative(),
      umbral: z.number().int().positive(),
    }).nullable(),
  })),
});

export type FichaInsignias = z.infer<typeof fichaInsigniasSchema>;
