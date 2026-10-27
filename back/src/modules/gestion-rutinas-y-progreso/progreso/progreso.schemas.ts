import { z } from "zod";
import { fechaSchema as fecha } from "../../../shared/utils/esquemas-fecha.js";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { textoOpcionalSchema } from "../../../shared/utils/esquemas-texto.js";
import { CODIGOS_MEDIDA, MEDIDAS } from "./medida.catalogo.js";

// ck_medidas_corporales_valor del DER: valor > 0. Además, dos decimales como la columna NUMERIC(6,2) y
// un rango biológicamente coherente según el tipo de medida.
const medidaSchema = z
  .object({
    codigo: z.enum(CODIGOS_MEDIDA),
    valor: z
      .number({ invalid_type_error: "El valor debe ser un número" })
      .positive("El valor debe ser mayor a 0")
      .refine((valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6, "Hasta 2 decimales"),
  })
  .refine(
    ({ codigo, valor }) => valor >= MEDIDAS[codigo].minimo && valor <= MEDIDAS[codigo].maximo,
    ({ codigo }) => ({
      message: `Debe estar entre ${MEDIDAS[codigo].minimo} y ${MEDIDAS[codigo].maximo} ${MEDIDAS[codigo].unidad}`,
      path: ["valor"],
    }),
  );

// Sin fecha se registra la de hoy; una fecha futura la rechaza el service. id_profesora solo lo manda la
// propietaria: una profesora carga siempre a su nombre.
export const registrarProgresoSchema = z
  .object({
    id_alumno: idSchema,
    id_profesora: idSchema.optional(),
    fecha: fecha.optional(),
    observaciones: textoOpcionalSchema(500, { multilinea: true })
      .optional()
      .transform((valor) => valor ?? null),
    medidas: z.array(medidaSchema).min(1).max(CODIGOS_MEDIDA.length),
  })
  .refine(({ medidas }) => new Set(medidas.map(({ codigo }) => codigo)).size === medidas.length, {
    message: "No se puede repetir una medida",
    path: ["medidas"],
  });

export const alumnoProgresoParamsSchema = z.object({ id: idDesdeTextoSchema });

export type RegistrarProgresoInput = z.infer<typeof registrarProgresoSchema>;
