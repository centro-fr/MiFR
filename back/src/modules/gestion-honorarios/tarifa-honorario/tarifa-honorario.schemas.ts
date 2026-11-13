import { z } from "../../../shared/utils/zod.js";
import { idDesdeTextoSchema, idSchema } from "../../../shared/utils/esquemas-id.js";
import { fechaSchema as fecha } from "../../../shared/utils/esquemas-fecha.js";
import { montoSchema } from "../../../shared/utils/esquemas-numero.js";

const concepto = z.enum(["ALUMNO_A_CARGO", "HORA_SUPLENCIA"]);
const tipo_valor = z.enum(["MONTO_FIJO", "PORCENTAJE"]);

// ck_tarifas_honorario_x1 a x3 del DER: valor mayor a 0, hasta 100 si es porcentaje, y solo
// ALUMNO_A_CARGO puede ir atada a un plan. Además, por la regla de honorarios del Sprint 5, lo que se
// cobra por alumno es siempre un porcentaje de lo cobrado y la hora de suplencia, siempre un monto fijo.
export const registrarTarifaSchema = z
  .object({
    id_profesora: idSchema,
    concepto,
    id_plan: idSchema
      .nullable()
      .optional()
      .transform((valor) => valor ?? null),
    tipo_valor,
    valor: montoSchema("valor"),
    fecha_vigencia_desde: fecha,
  })
  .refine(({ tipo_valor: tipo, valor }) => tipo !== "PORCENTAJE" || valor <= 100, {
    message: "Un porcentaje no puede superar 100",
    path: ["valor"],
  })
  .refine(({ concepto: concepto_, id_plan }) => concepto_ === "ALUMNO_A_CARGO" || id_plan === null, {
    message: "Las tarifas de HORA_SUPLENCIA no llevan plan",
    path: ["id_plan"],
  })
  .refine(
    ({ concepto: concepto_, tipo_valor: tipo }) => concepto_ !== "ALUMNO_A_CARGO" || tipo === "PORCENTAJE",
    {
      message: "Las tarifas de ALUMNO_A_CARGO son un porcentaje de lo cobrado",
      path: ["tipo_valor"],
    },
  )
  .refine(
    ({ concepto: concepto_, tipo_valor: tipo }) => concepto_ !== "HORA_SUPLENCIA" || tipo === "MONTO_FIJO",
    {
      message: "Las tarifas de HORA_SUPLENCIA son un monto fijo por hora",
      path: ["tipo_valor"],
    },
  );

export const tarifaIdParamSchema = z.object({
  id: idDesdeTextoSchema,
});

export const listarTarifasQuerySchema = z.object({
  id_profesora: idDesdeTextoSchema.optional(),
  vigentes: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),
});

export const cerrarTarifaSchema = z.object({
  fecha_hasta: fecha,
});

export type CerrarTarifaInput = z.infer<typeof cerrarTarifaSchema>;
export type RegistrarTarifaInput = z.infer<typeof registrarTarifaSchema>;
export type ListarTarifasQuery = z.infer<typeof listarTarifasQuerySchema>;
