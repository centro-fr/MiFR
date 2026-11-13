import cors from "cors";
import express, { Router, type Express } from "express";
import helmet from "helmet";
import type { ILogicaDifusionPublica } from "./modules/difusion-publica/interface/i-logica-difusion-publica.js";
import { createDifusionPublicaRoutes } from "./modules/difusion-publica/difusion-publica.routes.js";
import type { ILogicaCuotasPagos } from "./modules/gestion-cuotas-y-pagos/interface/i-logica-cuotas-pagos.js";
import { createGestionCuotasYPagosRoutes } from "./modules/gestion-cuotas-y-pagos/gestion-cuotas-y-pagos.routes.js";
import type { ILogicaInscripcionesYClases } from "./modules/gestion-inscripciones-y-clases/interface/i-logica-inscripciones-y-clases.js";
import { createGestionInscripcionesYClasesRoutes } from "./modules/gestion-inscripciones-y-clases/gestion-inscripciones-y-clases.routes.js";
import type { ILogicaNotificaciones } from "./modules/gestion-notificaciones/interface/i-logica-notificaciones.js";
import { createGestionNotificacionesRoutes } from "./modules/gestion-notificaciones/gestion-notificaciones.routes.js";
import type { ILogicaInsignias } from "./modules/gestion-insignias/interface/i-logica-insignias.js";
import { createGestionInsigniasRoutes } from "./modules/gestion-insignias/gestion-insignias.routes.js";
import type { ILogicaInformes } from "./modules/reportes/interface/i-logica-informes.js";
import { createReportesRoutes } from "./modules/reportes/reportes.routes.js";
import type { ILogicaPersonas } from "./modules/gestion-personas/interface/i-logica-personas.js";
import { createGestionPersonasRoutes } from "./modules/gestion-personas/gestion-personas.routes.js";
import type { ILogicaServicioEntrenamiento } from "./modules/gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import { createGestionServicioEntrenamientoRoutes } from "./modules/gestion-servicio-entrenamiento/gestion-servicio-entrenamiento.routes.js";
import type { ILogicaHonorarios } from "./modules/gestion-honorarios/interface/i-logica-honorarios.js";
import { createGestionHonorariosRoutes } from "./modules/gestion-honorarios/gestion-honorarios.routes.js";
import type { ILogicaUsuarios } from "./modules/gestion-usuarios/interface/i-logica-usuarios.js";
import { createGestionUsuariosRoutes } from "./modules/gestion-usuarios/gestion-usuarios.routes.js";
import type { IAutorizacion } from "./modules/gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "./modules/gestion-usuarios/sesion/interface/i-autenticacion.js";
import { crearControlDeAcceso } from "./shared/middlewares/auth.js";
import { errorHandler, notFoundHandler } from "./shared/middlewares/error-handler.js";
import { crearLimiteDePedidos, type LimitesDePedidos } from "./shared/middlewares/limite-pedidos.js";
import { createDocumentacionRoutes } from "./shared/openapi/documentacion.routes.js";
import type { DocumentoOpenApi } from "./shared/openapi/registro.js";
import { requestLogger } from "./shared/middlewares/logger.js";
import type { ILogicaRutinasYProgreso } from "./modules/gestion-rutinas-y-progreso/interface/i-logica-rutinas-y-progreso.js";
import { createGestionRutinasYProgresoRoutes } from "./modules/gestion-rutinas-y-progreso/gestion-rutinas-y-progreso.routes.js";

export interface AppDependencies {
  gestionUsuarios: ILogicaUsuarios;
  gestionPersonas: ILogicaPersonas;
  gestionServicioEntrenamiento: ILogicaServicioEntrenamiento;
  gestionInscripcionesYClases: ILogicaInscripcionesYClases;
  gestionCuotasYPagos: ILogicaCuotasPagos;
  gestionNotificaciones: ILogicaNotificaciones;
  gestionInsignias: ILogicaInsignias;
  gestionRutinasYProgreso: ILogicaRutinasYProgreso;
  reportes: ILogicaInformes;
  gestionHonorarios: ILogicaHonorarios;
  difusionPublica: ILogicaDifusionPublica;
  autenticacion: IAutenticacion;
  autorizacion: IAutorizacion;
}

export interface AppOpciones {
  // Sin documento no se publica Swagger: index.ts decide no exponerlo en producción.
  documentacionApi?: DocumentoOpenApi;
  // Sin lista se acepta cualquier origen, que solo sirve en desarrollo.
  origenesPermitidos?: string[];
  // Habilita POST /auth/desarrollo (login sin Google). index.ts lo impide en producción.
  loginDesarrollo?: boolean;
  // Sin límites no se corta ningún pedido: los tests de integración inician muchas sesiones seguidas.
  limitesDePedidos?: LimitesDePedidos;
  // Cuántos proxies hay delante de la API: de ahí sale req.ip, que es lo que cuenta el límite de pedidos.
  proxiesDeConfianza?: number;
}

// Van antes que cualquier ruta, así un pedido que excede el tope no llega a la base. /health queda
// afuera porque la consulta el monitor que mantiene despierta la API. Un pedido a /publico o al login
// cuenta también para el tope general.
function montarLimitesDePedidos(api: Router, limites: LimitesDePedidos): void {
  api.use(crearLimiteDePedidos(limites.api));
  api.use("/publico", crearLimiteDePedidos(limites.publico));
  api.use(["/auth/google", "/auth/desarrollo"], crearLimiteDePedidos(limites.inicioSesion));
}

export function createApp(deps: AppDependencies, opciones: AppOpciones = {}): Express {
  const app = express();
  // Un número y no true: con true cualquiera elige su IP mandando X-Forwarded-For.
  app.set("trust proxy", opciones.proxiesDeConfianza ?? 0);

  // Cabeceras de seguridad (nosniff, X-Frame-Options, CSP, HSTS) y sin X-Powered-By.
  app.use(helmet());
  app.use(cors(opciones.origenesPermitidos ? { origin: opciones.origenesPermitidos } : undefined));
  app.use(express.json());
  app.use(requestLogger);

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  // Prefijo versionado del SDD: un cambio incompatible de contrato se publica como /api/v2.
  const api = Router();
  if (opciones.limitesDePedidos) montarLimitesDePedidos(api, opciones.limitesDePedidos);
  if (opciones.documentacionApi) {
    api.use("/docs", createDocumentacionRoutes(opciones.documentacionApi));
  }
  // Va primero: es lo único sin sesión, y así ningún guardia de otro subsistema lo alcanza.
  api.use(createDifusionPublicaRoutes(deps.difusionPublica));
  const acceso = crearControlDeAcceso(deps.autenticacion, deps.autorizacion);
  api.use(
    createGestionUsuariosRoutes(deps.gestionUsuarios, acceso, { loginDesarrollo: opciones.loginDesarrollo }),
  );
  api.use(createGestionPersonasRoutes(deps.gestionPersonas, acceso));
  api.use(createGestionInsigniasRoutes(deps.gestionInsignias, acceso));
  api.use(createGestionRutinasYProgresoRoutes(deps.gestionRutinasYProgreso, acceso));
  api.use(createGestionServicioEntrenamientoRoutes(deps.gestionServicioEntrenamiento, acceso));
  // le llega, y montado antes bloquearía las rutas de alumnos que esos dos abren a otros roles.
  api.use(createGestionInscripcionesYClasesRoutes(deps.gestionInscripcionesYClases, acceso));
  api.use(createGestionCuotasYPagosRoutes(deps.gestionCuotasYPagos, acceso));
  api.use(createGestionNotificacionesRoutes(deps.gestionNotificaciones, acceso));
  api.use(createReportesRoutes(deps.reportes, acceso));
  api.use(createGestionHonorariosRoutes(deps.gestionHonorarios, acceso));
  app.use("/api/v1", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
