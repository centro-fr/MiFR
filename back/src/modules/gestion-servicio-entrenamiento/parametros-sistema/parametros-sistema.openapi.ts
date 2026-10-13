import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  cuerpoJson,
  fechaSchema,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { actualizarParametroSchema, claveParametroParamSchema } from "./parametros-sistema.schemas.js";

export const parametroSchema = z
  .object({
    clave: z.string().openapi({ example: "DIAS_RESERVA_PREINSCRIPCION" }),
    tipo_dato: z.enum(["TEXTO", "ENTERO", "DECIMAL", "BOOLEANO"]),
    valor: z
      .union([z.string(), z.number(), z.boolean()])
      .openapi({ description: "Ya convertido a su tipo", example: 3 }),
    descripcion: z.string(),
    fecha_actualizacion: fechaSchema
      .nullable()
      .openapi({ description: "NULL = todavía rige el valor inicial" }),
  })
  .openapi("Parametro");

export const datosBancariosSchema = z
  .object({
    cbu: z.string().openapi({ example: "0000003100012345678901" }),
    alias: z.string().openapi({ example: "mifr.centro" }),
    titular: z.string().openapi({ example: "Centro MiFR" }),
  })
  .openapi("DatosBancarios");

export function registrarDocumentacionParametros(registro: OpenAPIRegistry): void {
  const tags = ["Parámetros"];
  const security = SEGURIDAD_BEARER;
  const parametro = respuestaJson("Parámetro", parametroSchema);

  registro.registerPath({
    method: "get",
    path: "/parametros",
    tags,
    security,
    summary: "Listar los parámetros del sistema",
    description:
      "Requiere el rol PROPIETARIA y el permiso `PARAMETROS_EDITAR`. Trae todos los parámetros, también los " +
      "que todavía no se modificaron (rige su valor inicial).",
    responses: { 200: respuestaJson("Parámetros", z.array(parametroSchema)), ...respuestasDeError(401, 403) },
  });

  registro.registerPath({
    method: "get",
    path: "/parametros/datos-bancarios",
    tags,
    security,
    summary: "Datos bancarios para transferir",
    description:
      "Para el alumno, su tutor y la propietaria (US-16). Si la propietaria todavía no los cargó, " +
      "llegan vacíos.",
    responses: {
      200: respuestaJson("Datos bancarios", datosBancariosSchema),
      ...respuestasDeError(401, 403),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/parametros/{clave}",
    tags,
    security,
    summary: "Modificar un parámetro",
    description:
      "Requiere el rol PROPIETARIA y el permiso `PARAMETROS_EDITAR`. El valor debe ser del tipo del parámetro: " +
      "los enteros no pueden ser negativos (`DIAS_RESERVA_PREINSCRIPCION` hasta 365 y " +
      "`MINUTOS_CIERRE_ASISTENCIA` hasta 1440). Responde 400 si la clave no existe o el valor no es válido.",
    request: {
      params: claveParametroParamSchema,
      body: cuerpoJson(actualizarParametroSchema.openapi("ActualizarParametro", { example: { valor: 5 } })),
    },
    responses: { 200: parametro, ...respuestasDeError(400, 401, 403) },
  });
}
