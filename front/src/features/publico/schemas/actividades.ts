import { z } from "zod";

// Contrato de GET /api/v1/publico/actividades (back: panel-disponibilidad.openapi.ts, US-32). Es lo
// único que ve un visitante sin sesión: qué actividades da el centro y qué días, sin horas, profesoras
// ni cupos.

export const actividadPublicaSchema = z.object({
  id_actividad: z.number().int(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
  dias: z.array(z.number().int().min(1).max(6)),
  clases_por_semana: z.number().int(),
});

export type ActividadPublica = z.infer<typeof actividadPublicaSchema>;

export const actividadesPublicasSchema = z.object({ actividades: z.array(actividadPublicaSchema) });

export type ActividadesPublicas = z.infer<typeof actividadesPublicasSchema>;
