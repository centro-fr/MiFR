import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionInsignia } from "./insignia/insignia.openapi.js";

export function registrarDocumentacionGestionInsignias(registro: OpenAPIRegistry): void {
  registrarDocumentacionInsignia(registro);
}
