import { z } from "zod";

// Contrato de GET /api/v1/publico/disponibilidad (back: panel-disponibilidad.openapi.ts, US-32).
// Es lo único que ve un visitante sin sesión: no trae datos de alumnos ni de cuentas.

export const disponibilidadSchema = z.enum(["LIBRE", "CASI_LLENO", "COMPLETO", "SIN_LIMITE"]);

export type Disponibilidad = z.infer<typeof disponibilidadSchema>;

// Las horas viajan como TIME de Postgres serializado: "1970-01-01T09:00:00.000Z".
export const horarioPublicoSchema = z.object({
  id_horario: z.number().int(),
  dia_semana: z.number().int().min(1).max(6),
  hora_inicio: z.string(),
  hora_fin: z.string(),
  actividad: z.object({
    id_actividad: z.number().int(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
  }),
  profesora: z.object({ nombre: z.string(), apellido: z.string() }),
  cupo_maximo: z.number().int().nullable(),
  cupo_disponible: z.number().int().nullable(),
  disponibilidad: disponibilidadSchema,
});

export type HorarioPublico = z.infer<typeof horarioPublicoSchema>;

export const panelDisponibilidadSchema = z.object({ horarios: z.array(horarioPublicoSchema) });

export type PanelDisponibilidad = z.infer<typeof panelDisponibilidadSchema>;
