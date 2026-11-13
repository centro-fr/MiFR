import { z } from "../../../shared/utils/zod.js";
import { idDesdeTextoSchema } from "../../../shared/utils/esquemas-id.js";
import {
  textoBusquedaSchema,
  textoOpcionalSchema,
  textoSchema,
} from "../../../shared/utils/esquemas-texto.js";

// El código identifica la actividad (es único y no se puede cambiar), así que se normaliza a
// mayúsculas: "funcional" y "FUNCIONAL" son la misma actividad.
const codigo = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(20)
  .regex(
    /^(?=.*[A-Z])[A-Z0-9_-]+$/,
    "El código solo puede tener letras sin acento, números, guion y guion bajo, con al menos una letra",
  );
const nombre = textoSchema(60);
// La descripción se carga en un textarea, por eso admite saltos de línea.
const descripcion = textoOpcionalSchema(255, { multilinea: true }).optional();
const modalidad = z.enum(["GRUPAL", "PERSONALIZADA"]);
const cupo_maximo = z.number().int().positive().max(32767).nullable().optional();
// US-05: la pre-inscripción en una actividad así exige peso y talla. Sin el campo, no los exige.
const requiere_medidas = z.boolean().optional();

export const crearActividadSchema = z
  .object({
    codigo,
    nombre,
    descripcion,
    modalidad,
    cupo_maximo,
    requiere_medidas,
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
    requiere_medidas,
    reactivar: z.literal(true).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const actividadIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export const listarActividadQuerySchema = z.object({
  busqueda: textoBusquedaSchema(60).optional(),
  incluirBajas: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type CrearActividadInput = z.infer<typeof crearActividadSchema>;
export type ActualizarActividadInput = z.infer<typeof actualizarActividadSchema>;
export type ListarActividadQuery = z.infer<typeof listarActividadQuerySchema>;
