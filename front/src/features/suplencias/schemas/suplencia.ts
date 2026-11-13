import { z } from "zod";

const fechaApi = z.string().transform((valor) => valor.slice(0, 10));

export const suplenciaApiSchema = z.object({
  id_clase: z.number().int().positive(),
  id_prof_ausente: z.number().int().positive(),
  motivo: z.string().nullable(),
  fecha_registro: z.string(),
  id_usuario_registra: z.number().int().positive(),
  clase: z.object({
    id_horario: z.number().int().positive(),
    fecha_clase: fechaApi,
    id_prof_dictante: z.number().int().positive(),
    estado: z.enum(["PROGRAMADA", "DICTADA", "CANCELADA"]),
    horario: z.object({
      dia_semana: z.number().int().min(1).max(7),
      hora_inicio: z.string(),
      hora_fin: z.string(),
      actividad: z.object({ id_actividad: z.number().int().positive(), nombre: z.string() }),
    }),
    profesora: z.object({
      id_profesora: z.number().int().positive(),
      usuario: z.object({ nombre: z.string(), apellido: z.string() }),
    }),
  }),
  profesora_ausente: z.object({
    id_profesora: z.number().int().positive(),
    usuario: z.object({ nombre: z.string(), apellido: z.string() }),
  }),
});

export const suplenciaFormSchema = z.object({
  fechaClase: z.string().date("Ingresá una fecha válida."),
  idHorario: z.string().regex(/^\d+$/, "Elegí un horario."),
  idProfesoraSuplente: z.string().regex(/^\d+$/, "Elegí una profesora suplente."),
  motivo: z.string().trim().max(255, "Usá hasta 255 caracteres."),
});

export type SuplenciaFormValues = z.infer<typeof suplenciaFormSchema>;

export interface RegistrarSuplenciaBody {
  id_horario: number;
  fecha_clase: string;
  id_profesora_suplente: number;
  motivo?: string;
}
