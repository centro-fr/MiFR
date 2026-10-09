import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { enteroNoNegativoSchema } from "../../../shared/utils/esquemas-numero.js";
import {
  textoBusquedaSchema,
  textoOpcionalSchema,
  textoSchema,
} from "../../../shared/utils/esquemas-texto.js";

const PRECIO_MAXIMO = 99_999_999.99;

const tipo = z.enum(["MENSUAL", "CLASE_SUELTA"]);
const nombre = textoSchema(40);
const descripcion = textoOpcionalSchema(255, { multilinea: true }).optional();
const clases_por_semana = z.number().int().min(1).max(7).nullable().optional();
const dias_gracia = enteroNoNegativoSchema(365);
const id_actividad_exclusiva = idSchema.nullable().optional();
const profesora_unica = z.boolean();

// NUMERIC(10,2): con más de dos decimales Postgres redondearía en silencio. La comparación
// tolera el error de representación de los decimales en coma flotante (19.99 * 100).
const precio = z
  .number()
  .positive("El precio tiene que ser mayor a 0")
  .max(PRECIO_MAXIMO, `El precio no puede superar ${PRECIO_MAXIMO}`)
  .refine((valor) => Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6, {
    message: "El precio admite como máximo dos decimales",
  });

// Llega como AAAA-MM-DD y se guarda en una columna DATE: se convierte a las 00:00 UTC, que es
// como Prisma espera ese tipo.
const fecha = z
  .string({ invalid_type_error: "La fecha debe tener formato AAAA-MM-DD" })
  .date("La fecha debe tener formato AAAA-MM-DD")
  .transform((valor) => new Date(`${valor}T00:00:00Z`));

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
