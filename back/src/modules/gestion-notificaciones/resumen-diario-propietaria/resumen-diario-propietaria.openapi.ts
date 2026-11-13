import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  cobroSinRendirSchema,
  totalDeProfesoraSchema,
  transferenciaEnRevisionSchema,
} from "../../gestion-cuotas-y-pagos/pago/pago.openapi.js";

const nombre = { nombre: z.string(), apellido: z.string() };
const profesoraSchema = z.object({ id_profesora: z.number().int(), ...nombre });
const totalDeVencidas = { cantidad: z.number().int(), monto_estimado: z.number() };

const transferenciasSchema = z.object({
  cantidad: z.number().int(),
  total: z.number(),
  supera_24_horas: z.number().int().openapi({ description: "Pendientes desde hace 24 horas o más" }),
  por_superar_24_horas: z.number().int().openapi({ description: "Pendientes desde hace 12 a 24 horas" }),
  mas_antiguas: z.array(transferenciaEnRevisionSchema).openapi({ description: "Las 5 más viejas" }),
});

const efectivoSchema = z.object({
  cantidad: z.number().int(),
  total: z.number(),
  profesoras: z.array(totalDeProfesoraSchema),
  mas_antiguo: cobroSinRendirSchema.nullable(),
});

const cuotaVencidaSchema = z.object({
  id_inscripcion: z.number().int(),
  alumno: z.object({ id_alumno: z.number().int(), ...nombre }),
  plan: z.object({ id_plan: z.number().int(), nombre: z.string() }),
  profesora: profesoraSchema,
  fecha_vencimiento: fechaSchema,
  dias_vencida: z.number().int(),
  monto_estimado: z.number().nullable().openapi({ description: "null si el plan no tiene precio hoy" }),
});

const cuotasVencidasSchema = z.object({
  ...totalDeVencidas,
  cantidad_alumnos: z.number().int(),
  sin_precio: z
    .number()
    .int()
    .openapi({ description: "Vencidas que no suman al monto: su plan no tiene precio hoy" }),
  por_profesora: z.array(profesoraSchema.extend(totalDeVencidas)),
  por_plan: z.array(z.object({ id_plan: z.number().int(), nombre: z.string(), ...totalDeVencidas })),
  mas_atrasadas: z.array(cuotaVencidaSchema).openapi({ description: "Las 5 con más días de atraso" }),
});

const resumenDiarioSchema = z
  .object({
    fecha: fechaSchema.openapi({ description: "El día de Argentina del resumen" }),
    transferencias: transferenciasSchema.nullable(),
    efectivo: efectivoSchema.nullable(),
    cuotas_vencidas: cuotasVencidasSchema.nullable(),
    bloques_con_error: z
      .array(z.enum(["transferencias", "efectivo", "cuotas_vencidas"]))
      .openapi({ description: "Los bloques que no se pudieron armar, que llegan en null" }),
    sin_novedades: z.boolean().openapi({ description: 'Nada pendiente en ningún bloque: "Todo al día"' }),
  })
  .openapi("ResumenDiario");

export function registrarDocumentacionResumenDiario(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/resumen-diario",
    tags: ["Notificaciones"],
    security: SEGURIDAD_BEARER,
    summary: "Resumen diario de la propietaria (US-26)",
    description:
      "Requiere el rol `PROPIETARIA`. Lo pendiente del día, calculado al pedirlo: las transferencias que esperan " +
      "revisión, el efectivo que las profesoras no rindieron y las cuotas mensuales vencidas, con el monto " +
      "estimado al precio de hoy. Si un bloque no se puede armar, llega en null, figura en `bloques_con_error` " +
      "y los otros salen igual.",
    responses: {
      200: respuestaJson("Resumen del día", resumenDiarioSchema),
      ...respuestasDeError(401, 403),
    },
  });
}
