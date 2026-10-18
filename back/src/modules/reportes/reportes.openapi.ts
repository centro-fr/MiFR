import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionDetectorInactividad } from "./detector-inactividad/detector-inactividad.openapi.js";

export function registrarDocumentacionReportes(registro: OpenAPIRegistry): void {
  registrarDocumentacionDetectorInactividad(registro);
}
