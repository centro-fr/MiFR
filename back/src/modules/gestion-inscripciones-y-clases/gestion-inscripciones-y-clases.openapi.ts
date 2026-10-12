import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionInscripciones } from "./inscripcion/inscripcion.openapi.js";
import { registrarDocumentacionClases } from "./clase/clase.openapi.js";

export function registrarDocumentacionGestionInscripcionesYClases(registro: OpenAPIRegistry): void {
  registrarDocumentacionInscripciones(registro);
  registrarDocumentacionClases(registro);
}
