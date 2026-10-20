import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionLiquidaciones } from "./liquidacion/liquidacion.openapi.js";
import { registrarDocumentacionTarifasHonorario } from "./tarifa-honorario/tarifa-honorario.openapi.js";

export function registrarDocumentacionGestionHonorarios(registro: OpenAPIRegistry): void {
  registrarDocumentacionTarifasHonorario(registro);
  registrarDocumentacionLiquidaciones(registro);
}