import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionAlumnos } from "./modules/gestion-personas/alumno/alumno.openapi.js";
import { registrarDocumentacionProfesoras } from "./modules/gestion-personas/profesor/profesor.openapi.js";
import { registrarDocumentacionActividades } from "./modules/gestion-servicio-entrenamiento/actividad/actividad.openapi.js";
import { registrarDocumentacionHorarios } from "./modules/gestion-servicio-entrenamiento/horario/horario.openapi.js";
import { registrarDocumentacionPlanes } from "./modules/gestion-servicio-entrenamiento/plan/plan.openapi.js";
import { registrarDocumentacionInscripciones } from "./modules/gestion-inscripciones-y-clases/inscripcion/inscripcion.openapi.js";
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

// loginDesarrollo documenta POST /auth/desarrollo solo cuando la ruta existe.
export function registrarDocumentacionApi(
  registro: OpenAPIRegistry,
  { loginDesarrollo = false }: { loginDesarrollo?: boolean } = {},
): void {
  registrarSeguridadBearer(registro);
  registrarDocumentacionSesion(registro, { loginDesarrollo });
  registrarDocumentacionUsuarios(registro);
  registrarDocumentacionSeguridad(registro);
  registrarDocumentacionProfesoras(registro);
  registrarDocumentacionAlumnos(registro);
  registrarDocumentacionActividades(registro);
  registrarDocumentacionHorarios(registro);
  registrarDocumentacionPlanes(registro);
  registrarDocumentacionInscripciones(registro);
}
