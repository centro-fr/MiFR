import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registrarDocumentacionProfesoras } from "./modules/gestion-personas/profesor/profesor.openapi.js";
import { registrarDocumentacionActividades } from "./modules/gestion-servicio-entrenamiento/actividad/actividad.openapi.js";
import { registrarDocumentacionHorarios } from "./modules/gestion-servicio-entrenamiento/horario/horario.openapi.js";
import { registrarDocumentacionSeguridad } from "./modules/gestion-usuarios/rol/rol.openapi.js";
import { registrarDocumentacionSesion } from "./modules/gestion-usuarios/sesion/sesion.openapi.js";
import { registrarDocumentacionUsuarios } from "./modules/gestion-usuarios/usuario/user.openapi.js";
import { crearRegistro, type DocumentoOpenApi } from "./shared/openapi/registro.js";

export function generarDocumentoOpenApi(): DocumentoOpenApi {
  const registro = crearRegistro();
  registrarDocumentacionSesion(registro);
  registrarDocumentacionUsuarios(registro);
  registrarDocumentacionSeguridad(registro);
  registrarDocumentacionProfesoras(registro);
  registrarDocumentacionActividades(registro);
  registrarDocumentacionHorarios(registro);

  return new OpenApiGeneratorV3(registro.definitions).generateDocument({
    openapi: "3.0.3",
    info: {
      title: "MiFR API",
      version: "1.0.0",
      description: "API del sistema de gestión del centro de entrenamiento MiFR.",
    },
    servers: [{ url: "/api/v1" }],
  });
}
