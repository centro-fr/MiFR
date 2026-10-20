import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { respuestaJson, respuestasDeError, SEGURIDAD_BEARER } from "../../../shared/openapi/registro.js";
import {
  estadisticasInscripcionesQuerySchema,
  estadisticasPlanesQuerySchema,
  informeCobranzaQuerySchema,
  informeCuotasVencidasQuerySchema,
} from "./generador-informes.schemas.js";

const contacto = {
  nombre: z.string(),
  apellido: z.string(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
};

const itemCuotaVencidaSchema = z
  .object({
    id_inscripcion: z.number().int(),
    alumno: z.object({ id_alumno: z.number().int(), ...contacto }),
    plan: z.object({ id_plan: z.number().int(), nombre: z.string() }),
    profesora: z.object({ id_profesora: z.number().int(), nombre: z.string(), apellido: z.string() }),
    fecha_vencimiento: z.string().openapi({ description: "Fecha de vencimiento original (AAAA-MM-DD)" }),
    dias_vencida: z.number().int().openapi({ description: "Días transcurridos desde el vencimiento" }),
    monto_adeudado: z.number().openapi({ description: "Monto exigible al precio vigente del plan" }),
  })
  .openapi("ItemCuotaVencida");

const informeCuotasVencidasSchema = z
  .object({
    periodo: z.object({ desde: z.string().nullable(), hasta: z.string().nullable() }),
    resumen: z.object({
      total_alumnos_vencidos: z.number().int(),
      monto_total_adeudado: z.number(),
      promedio_deuda_alumno: z.number(),
    }),
    por_profesora: z.array(
      z.object({
        id_profesora: z.number().int(),
        nombre: z.string(),
        apellido: z.string(),
        cantidad_alumnos: z.number().int(),
        monto_total: z.number(),
      }),
    ),
    datos: z.array(itemCuotaVencidaSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("InformeCuotasVencidas");

const itemCobranzaSchema = z
  .object({
    id_pago: z.number().int(),
    id_cuota: z.number().int(),
    monto: z.number(),
    forma_pago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
    fecha_pago: z.string().openapi({ description: "Fecha y hora del pago (ISO)" }),
    alumno: z.object({ id_alumno: z.number().int(), nombre: z.string(), apellido: z.string() }),
    plan: z.object({ id_plan: z.number().int(), nombre: z.string() }),
    profesora_cobra: z
      .object({ id_profesora: z.number().int(), nombre: z.string(), apellido: z.string() })
      .nullable(),
  })
  .openapi("ItemCobranzaDetalle");

const informeCobranzaSchema = z
  .object({
    periodo: z.object({ desde: z.string(), hasta: z.string() }),
    resumen: z.object({
      total_cobrado: z.number(),
      total_efectivo: z.number(),
      total_transferencia: z.number(),
      cantidad_pagos: z.number().int(),
    }),
    por_forma_pago: z.array(
      z.object({
        forma_pago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
        total: z.number(),
        cantidad: z.number().int(),
        porcentaje: z.number(),
      }),
    ),
    datos: z.array(itemCobranzaSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .openapi("InformeCobranza");

const itemEstadisticaPlanSchema = z
  .object({
    id_plan: z.number().int(),
    nombre: z.string(),
    tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
    actividad_exclusiva: z.object({ id_actividad: z.number().int(), nombre: z.string() }).nullable(),
    cantidad_alumnos: z.number().int(),
    porcentaje: z.number(),
    precio_vigente: z.number().nullable(),
    ingreso_estimado: z.number(),
  })
  .openapi("ItemEstadisticaPlan");

const estadisticasPlanesSchema = z
  .object({
    resumen: z.object({
      total_alumnos_activos: z.number().int(),
      ingreso_estimado_total: z.number(),
      total_planes: z.number().int(),
    }),
    planes: z.array(itemEstadisticaPlanSchema),
  })
  .openapi("EstadisticasPlanes");

const itemEstadisticaMesSchema = z
  .object({
    mes: z.number().int(),
    anio: z.number().int(),
    nombre_mes: z.string(),
    cantidad: z.number().int(),
    diferencia_mes_anterior: z.number().int().nullable(),
    porcentaje_variacion: z.number().nullable(),
  })
  .openapi("ItemEstadisticaMes");

const estadisticasInscripcionesSchema = z
  .object({
    periodo: z.object({ desde: z.string(), hasta: z.string(), anio: z.number().int().nullable() }),
    resumen: z.object({
      total_altas: z.number().int(),
      promedio_mensual: z.number(),
      mes_pico: z
        .object({
          mes: z.number().int(),
          anio: z.number().int(),
          nombre_mes: z.string(),
          cantidad: z.number().int(),
        })
        .nullable(),
    }),
    meses: z.array(itemEstadisticaMesSchema),
  })
  .openapi("EstadisticasInscripciones");

export function registrarDocumentacionGeneradorInformes(registro: OpenAPIRegistry): void {
  const tags = ["Informes"];
  const security = SEGURIDAD_BEARER;
  const soloPropietaria = "Requiere el rol `PROPIETARIA` y el permiso `REPORTES_COBRANZA_VER`.";

  registro.registerPath({
    method: "get",
    path: "/reportes/cuotas-vencidas",
    tags,
    security,
    summary: "Informe de cuotas vencidas (US-34)",
    description:
      `${soloPropietaria} Lista los alumnos con cuota vencida al momento de la consulta (fuera del período ` +
      "de gracia), con su deuda exigible calculada según precio vigente, días de retraso, contacto e histórico.",
    request: { query: informeCuotasVencidasQuerySchema },
    responses: {
      200: respuestaJson("Informe de cuotas vencidas", informeCuotasVencidasSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/reportes/cobranza",
    tags,
    security,
    summary: "Informe de cobranza por período",
    description:
      `${soloPropietaria} Muestra el monto total cobrado y el desglose de pagos confirmados agrupados ` +
      "por forma de pago (efectivo y transferencia) con detalle paginado.",
    request: { query: informeCobranzaQuerySchema },
    responses: {
      200: respuestaJson("Informe de cobranza", informeCobranzaSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/reportes/planes",
    tags,
    security,
    summary: "Estadísticas de planes más elegidos (US-36)",
    description:
      `${soloPropietaria} Muestra la distribución de alumnos activos por plan comercial ordenada de mayor ` +
      "a menor, su porcentaje de mercado e ingresos estimados mensuales calculados al precio vigente.",
    request: { query: estadisticasPlanesQuerySchema },
    responses: {
      200: respuestaJson("Estadísticas de planes", estadisticasPlanesSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/reportes/inscripciones",
    tags,
    security,
    summary: "Estadísticas de nuevas inscripciones por mes (US-35)",
    description:
      `${soloPropietaria} Agrupa las altas definitivas de alumnos mes a mes en el año o período seleccionado, ` +
      "con comparativas intermensuales de crecimiento y mes pico.",
    request: { query: estadisticasInscripcionesQuerySchema },
    responses: {
      200: respuestaJson("Estadísticas de inscripciones", estadisticasInscripcionesSchema),
      ...respuestasDeError(400, 401, 403),
    },
  });
}
