import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionPanelDisponibilidad } from "./panel-disponibilidad/panel-disponibilidad.openapi.js";

export function registrarDocumentacionDifusionPublica(registro: OpenAPIRegistry): void {
  registrarDocumentacionPanelDisponibilidad(registro);
}
