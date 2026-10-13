import { z } from "zod";
import { fechaSchema } from "../../../shared/utils/esquemas-fecha.js";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { paginacionSchema } from "../../../shared/utils/esquemas-paginacion.js";
import { textoOpcionalSchema } from "../../../shared/utils/esquemas-texto.js";

const motivo = textoOpcionalSchema(255, { multilinea: true }).optional();

export const registrarSuplenciaSchema = z.object({
  id_horario: idSchema,
  fecha_clase: fechaSchema,
  id_profesora_suplente: idSchema,
  motivo,
});

export const cambiarSuplenciaSchema = z
  .object({ id_profesora_suplente: idSchema.optional(), motivo })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const suplenciaParamSchema = z.object({ idClase: idDesdeTextoSchema });

export const listarSuplenciasQuerySchema = z
  .object({
    desde: fechaSchema.optional(),
    hasta: fechaSchema.optional(),
    id_profesora: idDesdeTextoSchema.optional(),
    id_actividad: idDesdeTextoSchema.optional(),
    ...paginacionSchema(50),
  })
  .refine(({ desde, hasta }) => desde === undefined || hasta === undefined || desde <= hasta, {
    message: "desde no puede ser posterior a hasta",
    path: ["hasta"],
  });

export type RegistrarSuplenciaInput = z.infer<typeof registrarSuplenciaSchema>;
export type CambiarSuplenciaInput = z.infer<typeof cambiarSuplenciaSchema>;
export type ListarSuplenciasQuery = z.infer<typeof listarSuplenciasQuerySchema>;
