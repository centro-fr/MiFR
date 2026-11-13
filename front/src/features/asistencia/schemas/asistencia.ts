import { z } from "zod";

const fechaApiSchema = z.string().datetime({ offset: true });

export const claseApiSchema = z.object({
  id_clase: z.number().int().positive(),
  id_horario: z.number().int().positive(),
  fecha_clase: fechaApiSchema,
  id_prof_dictante: z.number().int().positive(),
  estado: z.enum(["PROGRAMADA", "DICTADA", "CANCELADA"]),
  fecha_cierre_asist: fechaApiSchema.nullable(),
  observaciones: z.string().nullable(),
  horario: z.object({
    hora_inicio: fechaApiSchema,
    hora_fin: fechaApiSchema,
    cupo_maximo: z.number().int().nullable(),
    actividad: z.object({
      id_actividad: z.number().int().positive(),
      nombre: z.string(),
      modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
      cupo_maximo: z.number().int().nullable(),
    }),
  }),
});

export const claseDelDiaApiSchema = claseApiSchema.extend({
  inscriptos: z.number().int().nonnegative(),
  cupo_disponible: z.number().int().nullable(),
});

const situacionCuotaApiSchema = z.object({
  estado: z.enum([
    "AL_DIA",
    "POR_VENCER",
    "VENCIDA",
    "CLASE_SUELTA_VIGENTE",
    "CLASE_SUELTA_VENCIDA",
    "PENDIENTE_DE_PAGO",
  ]),
  fecha_vencimiento: fechaApiSchema.nullable(),
  dias_restantes: z.number().int().nullable(),
  puede_asistir: z.boolean(),
  tiene_pago_pendiente: z.boolean(),
});

export const inscriptoConAsistenciaApiSchema = z.object({
  id_alumno: z.number().int().positive(),
  id_inscripcion: z.number().int().positive(),
  nombre: z.string(),
  apellido: z.string(),
  asistencia: z.enum(["sin_marcar", "presente", "ausente"]),
  observaciones: z.string().nullable(),
  situacion_cuota: situacionCuotaApiSchema.nullable(),
});

export const asistenciaDeClaseApiSchema = z.object({
  clase: claseApiSchema,
  inscriptos: z.array(inscriptoConAsistenciaApiSchema),
});

export type ClaseApi = z.infer<typeof claseApiSchema>;
export type ClaseDelDiaApi = z.infer<typeof claseDelDiaApiSchema>;
export type InscriptoConAsistenciaApi = z.infer<typeof inscriptoConAsistenciaApiSchema>;
export type AsistenciaDeClaseApi = z.infer<typeof asistenciaDeClaseApiSchema>;
