import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionProgreso } from "./progreso/progreso.openapi.js";
import { registrarDocumentacionRutina } from "./rutina/rutina.openapi.js";

export function registrarDocumentacionGestionRutinasYProgreso(registro: OpenAPIRegistry): void {
  registrarDocumentacionRutina(registro);
  registrarDocumentacionProgreso(registro);
}
