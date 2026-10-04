import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionProfesoras } from "./modules/gestion-personas/profesor/profesor.openapi.js";
import { registrarDocumentacionActividades } from "./modules/gestion-servicio-entrenamiento/actividad/actividad.openapi.js";
import { registrarDocumentacionHorarios } from "./modules/gestion-servicio-entrenamiento/horario/horario.openapi.js";
import { registrarDocumentacionSeguridad } from "./modules/gestion-usuarios/rol/rol.openapi.js";
import { registrarDocumentacionSesion } from "./modules/gestion-usuarios/sesion/sesion.openapi.js";
import { registrarDocumentacionUsuarios } from "./modules/gestion-usuarios/usuario/usuario.openapi.js";
import { GUIA_DE_PRUEBA } from "./openapi-guia.js";
import { registrarSeguridadBearer } from "./shared/openapi/registro.js";

export const CONFIGURACION_DOCUMENTO_API = {
  openapi: "3.0.3",
  info: {
    title: "MiFR API",
    version: "1.0.0",
    description: GUIA_DE_PRUEBA,
  },
  servers: [{ url: "/api/v1" }],
};

export function registrarDocumentacionApi(registro: OpenAPIRegistry): void {
  registrarSeguridadBearer(registro);
  registrarDocumentacionSesion(registro);
  registrarDocumentacionUsuarios(registro);
  registrarDocumentacionSeguridad(registro);
  registrarDocumentacionProfesoras(registro);
  registrarDocumentacionActividades(registro);
  registrarDocumentacionHorarios(registro);
}
