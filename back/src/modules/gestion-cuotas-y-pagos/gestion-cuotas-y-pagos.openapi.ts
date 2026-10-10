import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionPagos } from "./pago/pago.openapi.js";

export function registrarDocumentacionGestionCuotasYPagos(registro: OpenAPIRegistry): void {
  registrarDocumentacionPagos(registro);
}
