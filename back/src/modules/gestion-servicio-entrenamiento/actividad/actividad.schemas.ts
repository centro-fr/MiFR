import { z } from "zod";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";

const codigo = z.string().trim().min(1).max(20);
const nombre = z.string().trim().min(1).max(60);
const descripcion = z.string().trim().max(255).optional();
const modalidad = z.enum(["GRUPAL", "PERSONALIZADA"]);
const cupo_maximo = z.number().int().positive().max(32767).nullable().optional();

export const crearActividadSchema = z
  .object({
    codigo,
    nombre,
    descripcion,
    modalidad,
    cupo_maximo,
  })
  .refine((data) => data.modalidad !== "PERSONALIZADA" || data.cupo_maximo != null, {
    message: "El cupo máximo es obligatorio para la modalidad PERSONALIZADA",
    path: ["cupo_maximo"],
  });

export const actualizarActividadSchema = z
  .object({
    nombre: nombre.optional(),
    descripcion: descripcion.optional(),
    modalidad: modalidad.optional(),
    cupo_maximo: cupo_maximo.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const actividadIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export const listarActividadQuerySchema = z.object({
  busqueda: z.string().trim().optional(),
});

export type CrearActividadInput = z.infer<typeof crearActividadSchema>;
export type ActualizarActividadInput = z.infer<typeof actualizarActividadSchema>;
export type ListarActividadQuery = z.infer<typeof listarActividadQuerySchema>;
