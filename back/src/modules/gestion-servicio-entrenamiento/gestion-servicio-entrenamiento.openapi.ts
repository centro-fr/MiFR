import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionActividades } from "./actividad/actividad.openapi.js";
import { registrarDocumentacionHorarios } from "./horario/horario.openapi.js";
import { registrarDocumentacionPlanes } from "./plan/plan.openapi.js";
import { registrarDocumentacionParametros } from "./parametros-sistema/parametros-sistema.openapi.js";

export function registrarDocumentacionGestionServicioEntrenamiento(registro: OpenAPIRegistry): void {
  registrarDocumentacionActividades(registro);
  registrarDocumentacionHorarios(registro);
  registrarDocumentacionPlanes(registro);
  registrarDocumentacionParametros(registro);
}
