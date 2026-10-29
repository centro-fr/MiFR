import { z } from "zod";

// Contrato de US-33: GET /reportes/asistencia (back: reportes/generador-informes, en dev).

const enteroSchema = z.number().int().nonnegative();
const diaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha inválida")
  .transform((valor) => valor.slice(0, 10));

export const informeAsistenciaApiSchema = z.object({
  periodo: z.object({ desde: diaSchema, hasta: diaSchema }),
  resumen: z.object({
    clases_dictadas: enteroSchema,
    asistencias: enteroSchema,
    inasistencias: enteroSchema,
    porcentaje_asistencia: z.number(),
  }),
  por_profesora: z.array(
    z.object({
      id_profesora: z.number().int().positive(),
      nombre: z.string(),
      apellido: z.string(),
      clases_dictadas: enteroSchema,
      cantidad_alumnos: enteroSchema,
      asistencias: enteroSchema,
      porcentaje_promedio: z.number(),
    }),
  ),
  datos: z.array(
    z.object({
      id_alumno: z.number().int().positive(),
      nombre: z.string(),
      apellido: z.string(),
      estado: z.enum(["ACTIVO", "INACTIVO", "BAJA"]),
      clases_previstas: enteroSchema,
      asistencias: enteroSchema,
      inasistencias: enteroSchema,
      porcentaje_asistencia: z.number(),
    }),
  ),
  total: enteroSchema,
  limit: z.number().int().positive(),
  offset: enteroSchema,
});

export type InformeAsistenciaApi = z.infer<typeof informeAsistenciaApiSchema>;
