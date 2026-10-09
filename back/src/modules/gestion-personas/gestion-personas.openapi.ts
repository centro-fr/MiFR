import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionAlumnos } from "./alumno/alumno.openapi.js";
import { registrarDocumentacionProfesoras } from "./profesor/profesor.openapi.js";

export function registrarDocumentacionGestionPersonas(registro: OpenAPIRegistry): void {
  registrarDocumentacionProfesoras(registro);
  registrarDocumentacionAlumnos(registro);
}
