import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionNotificaciones } from "./notificacion/notificacion.openapi.js";
import { registrarDocumentacionResumenDiario } from "./resumen-diario-propietaria/resumen-diario-propietaria.openapi.js";

export function registrarDocumentacionGestionNotificaciones(registro: OpenAPIRegistry): void {
  registrarDocumentacionResumenDiario(registro);
  registrarDocumentacionNotificaciones(registro);
}
