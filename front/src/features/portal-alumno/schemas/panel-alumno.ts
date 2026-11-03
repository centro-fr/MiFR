import { z } from "zod";

const estadoCuotaSchema = z.enum(["AL_DIA", "EN_GRACIA", "VENCIDA"]);
const estadoAsistenciaSchema = z.enum(["PRESENTE", "AUSENTE"]);

export const panelAlumnoSchema = z.object({
  id_alumno: z.number().int().positive(),
  alumno: z.object({
    nombre: z.string(),
    apellido: z.string(),
  }),
  plan: z.object({
    nombre: z.string(),
    tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
    clases_por_semana: z.number().int().nullable(),
    profesora: z.string(),
    estado_cuota: estadoCuotaSchema,
    fecha_vencimiento: z.string(),
    dias_restantes: z.number().int(),
  }).nullable(),
  proximas_clases: z.array(
    z.object({
      id: z.number().int(),
      fecha: z.string(),
      hora_inicio: z.string(),
      hora_fin: z.string(),
      actividad: z.string(),
      profesora: z.string(),
      cupo_disponible: z.number().int().nullable(),
    }),
  ),
  historial_asistencias: z.array(
    z.object({
      id: z.number().int(),
      fecha: z.string(),
      actividad: z.string(),
      profesora: z.string(),
      estado: estadoAsistenciaSchema,
    }),
  ),
});

export type PanelAlumno = z.infer<typeof panelAlumnoSchema>;
