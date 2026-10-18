import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionDifusionPublica } from "./modules/difusion-publica/difusion-publica.openapi.js";
import { registrarDocumentacionGestionCuotasYPagos } from "./modules/gestion-cuotas-y-pagos/gestion-cuotas-y-pagos.openapi.js";
import { registrarDocumentacionGestionNotificaciones } from "./modules/gestion-notificaciones/gestion-notificaciones.openapi.js";
import { registrarDocumentacionGestionInscripcionesYClases } from "./modules/gestion-inscripciones-y-clases/gestion-inscripciones-y-clases.openapi.js";
import { registrarDocumentacionGestionPersonas } from "./modules/gestion-personas/gestion-personas.openapi.js";
import { registrarDocumentacionGestionServicioEntrenamiento } from "./modules/gestion-servicio-entrenamiento/gestion-servicio-entrenamiento.openapi.js";
import { registrarDocumentacionGestionUsuarios } from "./modules/gestion-usuarios/gestion-usuarios.openapi.js";
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
  registrarDocumentacionGestionUsuarios(registro, { loginDesarrollo });
  registrarDocumentacionGestionPersonas(registro);
  registrarDocumentacionGestionServicioEntrenamiento(registro);
  registrarDocumentacionGestionInscripcionesYClases(registro);
  registrarDocumentacionGestionCuotasYPagos(registro);
  registrarDocumentacionGestionNotificaciones(registro);
  registrarDocumentacionDifusionPublica(registro);
}
