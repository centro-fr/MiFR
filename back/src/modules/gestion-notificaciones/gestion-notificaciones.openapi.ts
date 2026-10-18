import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionResumenDiario } from "./resumen-diario-propietaria/resumen-diario-propietaria.openapi.js";

export function registrarDocumentacionGestionNotificaciones(registro: OpenAPIRegistry): void {
  registrarDocumentacionResumenDiario(registro);
}
