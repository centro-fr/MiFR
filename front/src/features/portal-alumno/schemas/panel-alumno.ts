import { z } from "zod";
import { estadoCuotaSchema } from "@/features/alumnos/schemas/alumno";

// GET /alumnos/mi-panel (alumno.openapi.ts del back, US-29). La cuota usa los mismos estados que la
// ficha del alumno; sin cuota paga (PENDIENTE_DE_PAGO) no hay vencimiento.
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
    fecha_vencimiento: z.string().nullable(),
    dias_restantes: z.number().int().nullable(),
  }).nullable(),
  proximas_clases: z.array(
    z.object({
      id_horario: z.number().int(),
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
      fecha: z.string(),
      actividad: z.string(),
      profesora: z.string(),
      estado: estadoAsistenciaSchema,
    }),
  ),
});

export type PanelAlumno = z.infer<typeof panelAlumnoSchema>;
