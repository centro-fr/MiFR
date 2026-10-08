import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";

// Horario de atención del centro (US-04): ninguna clase empieza antes ni termina después.
const HORA_APERTURA = "07:00";
const HORA_CIERRE = "20:00";

// Con formato HH:mm de dos dígitos, comparar los textos equivale a comparar las horas.
const hora = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm")
  .refine((valor) => valor >= HORA_APERTURA && valor <= HORA_CIERRE, {
    message: `La hora debe estar entre las ${HORA_APERTURA} y las ${HORA_CIERRE}`,
  });
const cupo_maximo = z.number().int().positive().max(32767).nullable().optional();
// 1 = lunes … 6 = sábado. El DER admite el domingo (7), pero el centro no abre ese día: la regla
// vive acá y no en el CHECK de la base, para que abrir los domingos no requiera una migración.
const dia_semana = z.number().int().min(1).max(6, "El centro no abre los domingos");

export const crearHorarioSchema = z
  .object({
    id_actividad: idSchema,
    id_profesora: idSchema,
    dia_semana,
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
    id_actividad: idSchema.optional(),
    id_profesora: idSchema.optional(),
    dia_semana: dia_semana.optional(),
    hora_inicio: hora.optional(),
    hora_fin: hora.optional(),
    cupo_maximo,
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const horarioIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export const listarHorarioQuerySchema = z.object({
  id_actividad: idDesdeTextoSchema.optional(),
  id_profesora: idDesdeTextoSchema.optional(),
});

export type CrearHorarioInput = z.infer<typeof crearHorarioSchema>;
export type ActualizarHorarioInput = z.infer<typeof actualizarHorarioSchema>;
export type ListarHorarioQuery = z.infer<typeof listarHorarioQuerySchema>;
