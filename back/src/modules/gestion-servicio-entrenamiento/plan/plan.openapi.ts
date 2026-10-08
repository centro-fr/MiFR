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
  actualizarPlanSchema,
  crearPlanSchema,
  listarPlanQuerySchema,
  planIdParamSchema,
  registrarPrecioSchema,
} from "./plan.schemas.js";

export const precioPlanSchema = z
  .object({
    id_plan_precio: z.number().int(),
    id_plan: z.number().int(),
    precio: z.number().openapi({ example: 25000 }),
    fecha_vigencia_desde: fechaSchema,
    fecha_vigencia_hasta: fechaSchema.nullable().openapi({ description: "NULL = vigente" }),
  })
  .openapi("PrecioPlan");

export const planSchema = z
  .object({
    id_plan: z.number().int(),
    tipo: z.enum(["MENSUAL", "CLASE_SUELTA"]),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    clases_por_semana: z.number().int().nullable(),
    dias_gracia: z.number().int(),
    id_actividad_exclusiva: z.number().int().nullable(),
    profesora_unica: z.boolean(),
    fecha_alta: fechaSchema,
    fecha_baja: fechaSchema.nullable(),
    actividad_exclusiva: z
      .object({
        id_actividad: z.number().int(),
        nombre: z.string(),
        modalidad: z.enum(["GRUPAL", "PERSONALIZADA"]),
      })
      .nullable(),
    precio_vigente: precioPlanSchema.nullable(),
    precio_programado: precioPlanSchema
      .nullable()
      .openapi({ description: "Aumento ya cargado que todavía no rige" }),
  })
  .openapi("Plan");

export function registrarDocumentacionPlanes(registro: OpenAPIRegistry): void {
  const tags = ["Planes"];
  const security = SEGURIDAD_BEARER;
  const plan = respuestaJson("Plan", planSchema);
  const soloPropietaria = "Requiere el rol PROPIETARIA y el permiso `PLANES_EDITAR`.";

  registro.registerPath({
    method: "get",
    path: "/planes",
    tags,
    security,
    summary: "Listar planes",
    description:
      "Requiere el permiso `PLANES_VER`. Por defecto solo los vigentes; `incluirBajas=true` suma los dados " +
      "de baja. `busqueda` filtra por nombre.",
    request: { query: listarPlanQuerySchema },
    responses: { 200: respuestaJson("Planes", z.array(planSchema)), ...respuestasDeError(400, 401, 403) },
  });

  registro.registerPath({
    method: "post",
    path: "/planes",
    tags,
    security,
    summary: "Dar de alta un plan",
    description:
      `${soloPropietaria} El precio inicial rige desde hoy. Un plan CLASE_SUELTA no lleva ` +
      "`clases_por_semana` y sus `dias_gracia` son 0. Responde 409 si ya hay un plan vigente con ese nombre.",
    request: {
      body: cuerpoJson(
        crearPlanSchema.openapi("CrearPlan", {
          example: {
            tipo: "MENSUAL",
            nombre: "Básico 2 días",
            clases_por_semana: 2,
            dias_gracia: 5,
            profesora_unica: true,
            precio: 25000,
          },
        }),
      ),
    },
    responses: { 201: plan, ...respuestasDeError(400, 401, 403, 409) },
  });

  registro.registerPath({
    method: "get",
    path: "/planes/{id}",
    tags,
    security,
    summary: "Obtener un plan",
    description: "Requiere el permiso `PLANES_VER`.",
    request: { params: planIdParamSchema },
    responses: { 200: plan, ...respuestasDeError(400, 401, 403, 404) },
  });

  registro.registerPath({
    method: "patch",
    path: "/planes/{id}",
    tags,
    security,
    summary: "Modificar un plan vigente",
    description:
      `${soloPropietaria} El tipo no se puede cambiar y el precio se actualiza con ` +
      "POST /planes/{id}/precios. Responde 409 si el nombre ya lo usa otro plan vigente.",
    request: {
      params: planIdParamSchema,
      body: cuerpoJson(actualizarPlanSchema.openapi("ActualizarPlan", { example: { clases_por_semana: 3 } })),
    },
    responses: { 200: plan, ...respuestasDeError(400, 401, 403, 404, 409) },
  });

  registro.registerPath({
    method: "delete",
    path: "/planes/{id}",
    tags,
    security,
    summary: "Dar de baja un plan",
    description:
      `${soloPropietaria} Baja lógica: el plan deja de admitir inscripciones nuevas y las que ya tiene ` +
      "siguen. Responde 409 si ya estaba dado de baja.",
    request: { params: planIdParamSchema },
    responses: {
      200: respuestaJson("Plan dado de baja", planSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/planes/{id}/precios",
    tags,
    security,
    summary: "Historial de precios de un plan",
    description: "Requiere el permiso `PLANES_VER`. Del más nuevo al más viejo, incluido el programado.",
    request: { params: planIdParamSchema },
    responses: {
      200: respuestaJson("Precios del plan", z.array(precioPlanSchema)),
      ...respuestasDeError(400, 401, 403, 404),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/planes/{id}/precios",
    tags,
    security,
    summary: "Actualizar el precio con fecha de vigencia",
    description:
      `${soloPropietaria} La fecha es hoy o futura. El precio anterior queda cerrado el día previo; si ya ` +
      "había un aumento programado desde esa fecha en adelante, el nuevo lo reemplaza. Lo ya cobrado no " +
      "cambia. Responde 409 si el plan está dado de baja o si ya tiene un precio que empezó a regir hoy.",
    request: {
      params: planIdParamSchema,
      body: cuerpoJson(
        registrarPrecioSchema.openapi("RegistrarPrecio", {
          example: { precio: 28000, fecha_vigencia_desde: "2026-11-01" },
        }),
      ),
    },
    responses: {
      201: respuestaJson("Precio registrado", precioPlanSchema),
      ...respuestasDeError(400, 401, 403, 404, 409),
    },
  });
}
