import type { OpenApiGeneratorV3, OpenAPIRegistry, ResponseConfig } from "@asteasolutions/zod-to-openapi";
import type { ZodTypeAny } from "zod";
import { z } from "../utils/zod.js";

// La documentación se arma con los mismos esquemas Zod que validan la entrada en las rutas:
// así el contrato publicado no puede desincronizarse de lo que el servidor acepta.
export type DocumentoOpenApi = ReturnType<OpenApiGeneratorV3["generateDocument"]>;

export const SEGURIDAD_BEARER = [{ bearerAuth: [] }];

const errorSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "VALIDATION_ERROR" }),
      message: z.string().openapi({ example: "Datos inválidos" }),
      details: z
        .object({ formErrors: z.array(z.string()), fieldErrors: z.record(z.string(), z.array(z.string())) })
        .optional()
        .openapi({ description: "Solo en errores de validación de Zod" }),
    }),
  })
  .openapi("Error");

const DESCRIPCION_ERRORES = {
  400: "Datos inválidos",
  401: "Sin sesión o con un token inválido o vencido",
  403: "Sin el rol o el permiso requerido",
  404: "Recurso no encontrado",
  409: "Conflicto con el estado actual del recurso",
} as const;

type CodigoError = keyof typeof DESCRIPCION_ERRORES;

export const fechaSchema = z.string().datetime().openapi({ example: "2026-10-03T00:00:00.000Z" });

export function registrarSeguridadBearer(registro: OpenAPIRegistry): void {
  registro.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Token que devuelve POST /auth/google",
  });
}

export function cuerpoJson(schema: ZodTypeAny) {
  return { required: true, content: { "application/json": { schema } } };
}

export function respuestaJson(descripcion: string, schema: ZodTypeAny): ResponseConfig {
  return { description: descripcion, content: { "application/json": { schema } } };
}

export function respuestasDeError(...codigos: CodigoError[]): Record<number, ResponseConfig> {
  return Object.fromEntries(
    codigos.map((codigo) => [codigo, respuestaJson(DESCRIPCION_ERRORES[codigo], errorSchema)]),
  );
}
