import { z } from "zod";
import { estadoCuotaSchema } from "@/features/alumnos/schemas/alumno";

// GET /alumnos/mi-panel (alumno.openapi.ts del back, US-29). La cuota usa los mismos estados que la
// ficha del alumno; sin cuota paga (PENDIENTE_DE_PAGO) no hay vencimiento.
const estadoAsistenciaSchema = z.enum(["PRESENTE", "AUSENTE"]);

export const planDelAlumnoSchema = z.object({
  id_inscripcion: z.number().int().positive(),
  nombre: z.string(),
  tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
  clases_por_semana: z.number().int().nullable(),
  profesora: z.string(),
  actividades: z.array(z.string()),
  estado_cuota: estadoCuotaSchema,
  // Sin cuota paga (PENDIENTE_DE_PAGO) no hay vencimiento.
  fecha_vencimiento: z.string().nullable(),
  dias_restantes: z.number().int().nullable(),
});

export type PlanDelAlumno = z.infer<typeof planDelAlumnoSchema>;

export const panelAlumnoSchema = z.object({
  id_alumno: z.number().int().positive(),
  alumno: z.object({
    nombre: z.string(),
    apellido: z.string(),
  }),
  // Una por inscripción vigente: un alumno puede tener un plan por actividad.
  planes: z.array(planDelAlumnoSchema),
  proximas_clases: z.array(
    z.object({
      id_horario: z.number().int(),
      id_inscripcion: z.number().int().positive(),
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
      id_clase: z.number().int(),
      id_inscripcion: z.number().int().positive(),
      fecha: z.string(),
      actividad: z.string(),
      profesora: z.string(),
      estado: estadoAsistenciaSchema,
    }),
  ),
});

export type PanelAlumno = z.infer<typeof panelAlumnoSchema>;
