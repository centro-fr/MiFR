import { z } from "zod";

const hora = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm");
const cupo_maximo = z.number().int().positive().max(32767).nullable().optional();

export const crearHorarioSchema = z
  .object({
    id_actividad: z.number().int().positive(),
    id_profesora: z.number().int().positive(),
    dia_semana: z.number().int().min(1).max(7),
    hora_inicio: hora,
    hora_fin: hora,
    cupo_maximo,
  })
  .refine((datos) => datos.hora_fin > datos.hora_inicio, {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["hora_fin"],
  });

export const actualizarHorarioSchema = z
  .object({
    id_actividad: z.number().int().positive().optional(),
    id_profesora: z.number().int().positive().optional(),
    dia_semana: z.number().int().min(1).max(7).optional(),
    hora_inicio: hora.optional(),
    hora_fin: hora.optional(),
    cupo_maximo,
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const horarioIdParamSchema = z.object({
  id: z.coerce.number().int().positive("id inválido"),
});

export const listarHorarioQuerySchema = z.object({
  id_actividad: z.coerce.number().int().positive().optional(),
  id_profesora: z.coerce.number().int().positive().optional(),
});

export type CrearHorarioInput = z.infer<typeof crearHorarioSchema>;
export type ActualizarHorarioInput = z.infer<typeof actualizarHorarioSchema>;
export type ListarHorarioQuery = z.infer<typeof listarHorarioQuerySchema>;
