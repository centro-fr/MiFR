import { z } from "zod";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { montoSchema } from "../../../shared/utils/esquemas-numero.js";
import { LIMITE_MAXIMO, paginacionSchema } from "../../../shared/utils/esquemas-paginacion.js";
import { textoSchema } from "../../../shared/utils/esquemas-texto.js";
import { fechaSchema } from "../../../shared/utils/esquemas-fecha.js";

// El código lo carga la propietaria (UK del DER, VARCHAR(20)): letras sin acentos, dígitos, guion y
// guion bajo, y se guarda en mayúsculas para que "verano26" y "VERANO26" sean el mismo.
const codigo = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_-]{1,20}$/,
    "El código lleva de 1 a 20 letras sin acentos, dígitos, guiones o guiones bajos",
  )
  .transform((valor) => valor.toUpperCase());

const MAXIMO_PLANES = 50;
const ids_planes = z
  .array(idSchema)
  .min(1, "La promoción aplica al menos a un plan")
  .max(MAXIMO_PLANES, `No puede aplicar a más de ${MAXIMO_PLANES} planes`)
  .refine((ids) => new Set(ids).size === ids.length, "No se puede repetir un plan");

const datos = {
  codigo,
  nombre: textoSchema(60),
  tipo_descuento: z.enum(["PORCENTAJE", "MONTO_FIJO"]),
  // ck_promociones_x1: mayor a 0, con dos decimales como máximo. El tope del porcentaje lo revisa el refine.
  valor: montoSchema("valor"),
  fecha_desde: fechaSchema,
  fecha_hasta: fechaSchema,
  ids_planes,
};

interface ReglasEntreCampos {
  tipo_descuento?: "PORCENTAJE" | "MONTO_FIJO";
  valor?: number;
  fecha_desde?: Date;
  fecha_hasta?: Date;
}

// ck_promociones_x3 y un porcentaje menor a 100, cuando vienen los dos campos. Si en una edición viene
// uno solo, el service las revisa con el valor guardado. El DER admite el 100 % (ck_promociones_x2),
// pero dejaría la cuota en 0 y un pago tiene que ser mayor a 0 (ck_pagos_x1): ese alumno no podría
// pagar ni recibir el alta definitiva.
function porcentajeValido({ tipo_descuento, valor }: ReglasEntreCampos): boolean {
  return tipo_descuento !== "PORCENTAJE" || valor === undefined || valor < 100;
}

function fechasEnOrden({ fecha_desde, fecha_hasta }: ReglasEntreCampos): boolean {
  return !fecha_desde || !fecha_hasta || fecha_hasta >= fecha_desde;
}

const PORCENTAJE_INVALIDO = {
  message: "Un descuento en porcentaje tiene que ser menor al 100 %",
  path: ["valor"],
};
const FECHAS_INVERTIDAS = {
  message: "La fecha hasta no puede ser anterior a la fecha desde",
  path: ["fecha_hasta"],
};

// Los campos sin las reglas entre ellos: es lo que documenta Swagger, con un ejemplo en texto.
export const camposDePromocion = z.object(datos);

export const crearPromocionSchema = camposDePromocion
  .refine(porcentajeValido, PORCENTAJE_INVALIDO)
  .refine(fechasEnOrden, FECHAS_INVERTIDAS);

export const camposEditablesDePromocion = camposDePromocion.partial();

export const actualizarPromocionSchema = camposEditablesDePromocion
  .refine((cambios) => Object.keys(cambios).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  })
  .refine(porcentajeValido, PORCENTAJE_INVALIDO)
  .refine(fechasEnOrden, FECHAS_INVERTIDAS);

export const listarPromocionesQuerySchema = z.object({
  estado: z.enum(["ACTIVA", "PROGRAMADA", "VENCIDA", "DESACTIVADA"]).optional(),
  id_plan: idDesdeTextoSchema.optional(),
  ...paginacionSchema(LIMITE_MAXIMO),
});

export const promocionIdParamSchema = z.object({ id: idDesdeTextoSchema });

export type CrearPromocionInput = z.infer<typeof crearPromocionSchema>;
export type ActualizarPromocionInput = z.infer<typeof actualizarPromocionSchema>;
export type ListarPromocionesQuery = z.infer<typeof listarPromocionesQuerySchema>;
