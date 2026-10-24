import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import {
  cerrarTarifaSchema,
  listarTarifasQuerySchema,
  registrarTarifaSchema,
  tarifaIdParamSchema,
} from "./tarifa-honorario.schemas.js";

const tarifaSchema = z
  .object({
    id_tarifa: z.number().int(),
    id_profesora: z.number().int(),
    concepto: z.enum(["ALUMNO_A_CARGO", "HORA_SUPLENCIA"]),
    id_plan: z
      .number()
      .int()
      .nullable()
      .openapi({ description: "null: aplica a todos los planes. `HORA_SUPLENCIA` nunca lleva plan" }),
    tipo_valor: z.enum(["MONTO_FIJO", "PORCENTAJE"]),
    valor: z.number().openapi({
      description:
        "Pesos si es `MONTO_FIJO`; porcentaje de lo cobrado de la cuota (hasta 100) si es `PORCENTAJE`",
    }),
    fecha_vigencia_desde: fechaSchema,
    fecha_vigencia_hasta: fechaSchema.nullable().openapi({ description: "null: sigue vigente" }),
  })
  .openapi("TarifaHonorario");

const tarifaConPlanSchema = tarifaSchema
  .extend({
    plan: z
      .object({ id_plan: z.number().int(), nombre: z.string() })
      .nullable()
      .openapi({ description: "El plan al que aplica; null cuando aplica a todos los planes" }),
  })
  .openapi("TarifaHonorarioConPlan");

export function registrarDocumentacionTarifasHonorario(registro: OpenAPIRegistry): void {
  const tags = ["Tarifas de honorarios"];
  const security = SEGURIDAD_BEARER;
  const soloPropietaria = "Requiere rol `PROPIETARIA` y el permiso";

  registro.registerPath({
    method: "get",
    path: "/tarifas-honorario",
    tags,
    security,
    summary: "Listar tarifas de honorarios (US-23)",
    description: `${soloPropietaria} \`HONORARIOS_VER_TODOS\`. Filtra por profesora (\`id_profesora\`). Con \`vigentes=true\` trae solo las que rigen hoy o empiezan más adelante; sin eso, también el historial.`,
    request: { query: listarTarifasQuerySchema },
    responses: {
      200: respuestaJson("Tarifas", z.array(tarifaSchema)),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/tarifas-honorario",
    tags,
    security,
    summary: "Registrar una tarifa de honorarios (US-23)",
    description: `${soloPropietaria} \`HONORARIOS_LIQUIDAR\`. \`ALUMNO_A_CARGO\` se cobra por inscripto, por plan o para todos los planes; \`HORA_SUPLENCIA\` no lleva plan. Un porcentaje va de más de 0 a 100. La vigencia no puede empezar en el pasado (400). La profesora y el plan tienen que existir (400). 409 si hay una tarifa programada en uso por una liquidación que empieza en esa fecha o después.`,
    request: {
      body: cuerpoJson(
        registrarTarifaSchema.openapi("RegistrarTarifaHonorario", {
          example: {
            id_profesora: 3,
            concepto: "ALUMNO_A_CARGO",
            id_plan: null,
            tipo_valor: "PORCENTAJE",
            valor: 50,
            fecha_vigencia_desde: "2026-11-01",
          },
        }),
      ),
    },
    responses: {
      201: respuestaJson("Tarifa registrada", tarifaSchema),
      ...respuestasDeError(400, 401, 403, 409),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/tarifas-honorario/{id}/cerrar",
    tags,
    security,
    summary: "Cerrar la vigencia de una tarifa (US-23)",
    description: `${soloPropietaria} \`HONORARIOS_LIQUIDAR\`. La tarifa rige hasta \`fecha_hasta\`, incluida. La fecha no puede ser anterior a hoy ni al inicio de la vigencia (400).`,
    request: {
      params: tarifaIdParamSchema,
      body: cuerpoJson(
        cerrarTarifaSchema.openapi("CerrarTarifaHonorario", { example: { fecha_hasta: "2026-12-31" } }),
      ),
    },
    responses: {
      200: respuestaJson("Tarifa cerrada", tarifaSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });
}
