import { z } from "zod";
import { actividadApiSchema } from "@/features/actividades/schemas/actividad";

// Contrato de /api/v1/profesoras y /api/v1/horarios (back: profesor.openapi.ts y horario.openapi.ts).

export const profesoraApiSchema = z.object({
  id_profesora: z.number().int(),
  id_usuario: z.number().int(),
  especialidad: z.string().nullable(),
  fecha_alta: z.string(),
  fecha_baja: z.string().nullable(),
  usuario: z.object({ nombre: z.string(), apellido: z.string() }),
});

export type ProfesoraApi = z.infer<typeof profesoraApiSchema>;

// Las horas viajan como TIME de Postgres serializado: "1970-01-01T09:00:00.000Z".
export const horarioApiSchema = z.object({
  id_horario: z.number().int(),
  id_actividad: z.number().int(),
  id_profesora: z.number().int(),
  dia_semana: z.number().int().min(1).max(7),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  cupo_maximo: z.number().int().nullable(),
  fecha_alta: z.string(),
  fecha_baja: z.string().nullable(),
  actividad: actividadApiSchema,
  profesora: profesoraApiSchema,
  cupo_maximo_efectivo: z.number().int().nullable(),
});

export type HorarioApi = z.infer<typeof horarioApiSchema>;

export const horarioConAdvertenciaApiSchema = z.object({
  horario: horarioApiSchema,
  advertencia: z.string(),
});

// Cuerpo de POST /horarios. Las horas van como "HH:mm" y el día como 1 (lunes) a 7 (domingo).
export interface GuardarHorarioBody {
  id_actividad: number;
  id_profesora: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number | null;
}
