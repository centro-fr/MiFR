import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionNotificaciones } from "./notificacion/notificacion.openapi.js";

export function registrarDocumentacionGestionNotificaciones(registro: OpenAPIRegistry): void {
  registrarDocumentacionNotificaciones(registro);
}
