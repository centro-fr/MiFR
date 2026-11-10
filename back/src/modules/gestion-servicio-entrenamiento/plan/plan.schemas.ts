import { z } from "../../../shared/utils/zod.js";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { enteroNoNegativoSchema, montoSchema } from "../../../shared/utils/esquemas-numero.js";
import { fechaSchema as fecha } from "../../../shared/utils/esquemas-fecha.js";
import {
  textoBusquedaSchema,
  textoOpcionalSchema,
  textoSchema,
} from "../../../shared/utils/esquemas-texto.js";

const tipo = z.enum(["MENSUAL", "CLASE_SUELTA"]);
const nombre = textoSchema(40);
const descripcion = textoOpcionalSchema(255, { multilinea: true }).optional();
const clases_por_semana = z.number().int().min(1).max(7).nullable().optional();
const dias_gracia = enteroNoNegativoSchema(365);
const id_actividad_exclusiva = idSchema.nullable().optional();
const profesora_unica = z.boolean();

const precio = montoSchema("precio");

interface DatosDeFrecuencia {
  tipo?: "MENSUAL" | "CLASE_SUELTA";
  clases_por_semana?: number | null;
  dias_gracia?: number;
}

// ck_planes_x3 del DER: la clase suelta no tiene frecuencia semanal ni días de gracia.
export function respetaReglaClaseSuelta({
  tipo,
  clases_por_semana,
  dias_gracia,
}: DatosDeFrecuencia): boolean {
  return tipo !== "CLASE_SUELTA" || (clases_por_semana == null && !dias_gracia);
}

const MENSAJE_CLASE_SUELTA = "Un plan CLASE_SUELTA no lleva clases por semana y sus días de gracia son 0";

export const crearPlanSchema = z
  .object({
    tipo,
    nombre,
    descripcion,
    clases_por_semana,
    dias_gracia: dias_gracia.default(0),
    id_actividad_exclusiva,
    profesora_unica: profesora_unica.default(false),
    precio,
  })
  .refine(respetaReglaClaseSuelta, { message: MENSAJE_CLASE_SUELTA, path: ["tipo"] });

// El tipo no se cambia: define cómo vencen las cuotas de las inscripciones que ya tiene el plan.
// El precio tampoco: se actualiza con vigencia por POST /planes/:id/precios (US-12).
export const actualizarPlanSchema = z
  .object({
    nombre: nombre.optional(),
    descripcion: descripcion.optional(),
    clases_por_semana,
    dias_gracia: dias_gracia.optional(),
    id_actividad_exclusiva,
    profesora_unica: profesora_unica.optional(),
    reactivar: z.literal(true).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

export const registrarPrecioSchema = z.object({
  precio,
  fecha_vigencia_desde: fecha,
});

export const planIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export const listarPlanQuerySchema = z.object({
  busqueda: textoBusquedaSchema(40).optional(),
  tipo: tipo.optional(),
  id_actividad_exclusiva: idDesdeTextoSchema.optional(),
  incluirBajas: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),
});

export type CrearPlanInput = z.infer<typeof crearPlanSchema>;
export type ActualizarPlanInput = z.infer<typeof actualizarPlanSchema>;
export type RegistrarPrecioInput = z.infer<typeof registrarPrecioSchema>;
export type ListarPlanQuery = z.infer<typeof listarPlanQuerySchema>;
