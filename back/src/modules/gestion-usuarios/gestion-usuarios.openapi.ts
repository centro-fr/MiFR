import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { OpcionesGestionUsuarios } from "./gestion-usuarios.routes.js";
import { registrarDocumentacionSeguridad } from "./rol/rol.openapi.js";
import { registrarDocumentacionSesion } from "./sesion/sesion.openapi.js";
import { registrarDocumentacionUsuarios } from "./usuario/usuario.openapi.js";

export function registrarDocumentacionGestionUsuarios(
  registro: OpenAPIRegistry,
  opciones: OpcionesGestionUsuarios = {},
): void {
  registrarDocumentacionSesion(registro, opciones);
  registrarDocumentacionUsuarios(registro);
  registrarDocumentacionSeguridad(registro);
}
