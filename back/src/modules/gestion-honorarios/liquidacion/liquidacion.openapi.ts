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
  generarLiquidacionesSchema,
  liquidacionIdParamSchema,
  listarLiquidacionesQuerySchema,
} from "./liquidacion.schemas.js";

const liquidacionSchema = z
  .object({
    id_liquidacion: z.number().int(),
    id_profesora: z.number().int(),
    periodo_desde: fechaSchema,
    periodo_hasta: fechaSchema,
    fecha_liquidacion: fechaSchema,
    monto_total: z.number().openapi({ description: "Suma de sus detalles; puede ser negativo" }),
    estado: z.enum(["BORRADOR", "CERRADA", "PAGADA"]),
    profesora: z.object({
      id_profesora: z.number().int(),
      usuario: z.object({ nombre: z.string(), apellido: z.string() }),
    }),
  })
  .openapi("Liquidacion");

const detalleSchema = z
  .object({
    id_liq_detalle: z.number().int(),
    id_tarifa: z.number().int(),
    concepto: z.enum(["ALUMNO_A_CARGO", "CLASE_SUPLIDA", "DESCUENTO_AUSENCIA"]),
    id_inscripcion: z.number().int().nullable(),
    id_clase: z.number().int().nullable(),
    monto: z.number().openapi({ description: "Negativo en DESCUENTO_AUSENCIA" }),
    alumno: z
      .object({ id_alumno: z.number().int(), nombre: z.string(), apellido: z.string() })
      .nullable()
      .openapi({ description: "Solo en ALUMNO_A_CARGO" }),
    clase: z
      .object({
        fecha_clase: fechaSchema,
        hora_inicio: fechaSchema,
        hora_fin: fechaSchema,
        actividad: z.string(),
      })
      .nullable()
      .openapi({ description: "Solo en CLASE_SUPLIDA y DESCUENTO_AUSENCIA" }),
  })
  .openapi("DetalleLiquidacion");

const liquidacionDetalladaSchema = liquidacionSchema
  .extend({ detalles: z.array(detalleSchema) })
  .openapi("LiquidacionDetallada");

const resumenSchema = z
  .object({
    periodo: z.string().openapi({ example: "2026-10" }),
    total_general: z.number(),
    liquidaciones: z.array(liquidacionSchema),
  })
  .openapi("ResumenLiquidaciones");

const advertenciaSchema = z
  .object({
    id_profesora: z.number().int(),
    concepto: z.enum(["ALUMNO_A_CARGO", "HORA_SUPLENCIA"]),
    motivo: z.enum(["SIN_TARIFA", "TARIFA_NO_APLICABLE"]),
    id_inscripcion: z.number().int().nullable(),
    id_clase: z.number().int().nullable(),
    fecha: fechaSchema.openapi({ description: "El día con el que se buscó la tarifa vigente" }),
  })
  .openapi("AdvertenciaHonorario");

const generacionSchema = resumenSchema
  .extend({
    advertencias: z.array(advertenciaSchema),
    sin_recalcular: z.array(z.number().int()).openapi({
      description: "Profesoras cuya liquidación ya estaba CERRADA o PAGADA: no se recalculó",
    }),
  })
  .openapi("ResultadoGeneracionLiquidaciones");

export function registrarDocumentacionLiquidaciones(registro: OpenAPIRegistry): void {
  const tags = ["Liquidaciones"];
  const security = SEGURIDAD_BEARER;
  const soloPropietaria = "Requiere rol `PROPIETARIA` y el permiso";

  registro.registerPath({
    method: "post",
    path: "/liquidaciones",
    tags,
    security,
    summary: "Generar o recalcular las liquidaciones de un mes (US-23)",
    description: `${soloPropietaria} \`HONORARIOS_LIQUIDAR\`. Crea el BORRADOR de cada profesora para el \`periodo\` (AAAA-MM) o lo recalcula si ya existe. Las liquidaciones CERRADA o PAGADA no se tocan y se informan en \`sin_recalcular\`. Las líneas sin tarifa vigente no se generan y vuelven en \`advertencias\`. 400 si el mes todavía no empezó.`,
    request: { body: cuerpoJson(generarLiquidacionesSchema.openapi("GenerarLiquidaciones")) },
    responses: {
      200: respuestaJson("Liquidaciones del mes", generacionSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/liquidaciones",
    tags,
    security,
    summary: "Listar las liquidaciones de un mes (US-23)",
    description: `${soloPropietaria} \`HONORARIOS_VER_TODOS\`. Una fila por profesora, con el total general. \`periodo\` con formato AAAA-MM.`,
    request: { query: listarLiquidacionesQuerySchema },
    responses: {
      200: respuestaJson("Liquidaciones del mes", resumenSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/liquidaciones/{id}",
    tags,
    security,
    summary: "Ver una liquidación con su detalle (US-23)",
    description: `${soloPropietaria} \`HONORARIOS_VER_TODOS\`. Detalle por alumno a cargo y por clase suplida.`,
    request: { params: liquidacionIdParamSchema },
    responses: {
      200: respuestaJson("Liquidación", liquidacionDetalladaSchema),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/liquidaciones/{id}/cerrar",
    tags,
    security,
    summary: "Cerrar una liquidación (US-23)",
    description: `${soloPropietaria} \`HONORARIOS_LIQUIDAR\`. BORRADOR pasa a CERRADA: queda como foto y ya no se recalcula. 409 si no está en BORRADOR.`,
    request: { params: liquidacionIdParamSchema },
    responses: {
      200: respuestaJson("Liquidación cerrada", liquidacionDetalladaSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/liquidaciones/{id}/pagar",
    tags,
    security,
    summary: "Marcar una liquidación como pagada (US-23)",
    description: `${soloPropietaria} \`HONORARIOS_LIQUIDAR\`. CERRADA pasa a PAGADA. 409 si no está CERRADA.`,
    request: { params: liquidacionIdParamSchema },
    responses: {
      200: respuestaJson("Liquidación pagada", liquidacionDetalladaSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });
}