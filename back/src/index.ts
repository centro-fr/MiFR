import "dotenv/config";
import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { createApp } from "./app.js";
import { GestionUsuariosService } from "./modules/gestion-usuarios/gestion-usuarios.service.js";
import { GoogleAutenticacion } from "./modules/gestion-usuarios/sesion/google-autenticacion.js";
import { JwtService } from "./modules/gestion-usuarios/sesion/jwt.service.js";
import { SesionService } from "./modules/gestion-usuarios/sesion/sesion.service.js";
import { RolRepository } from "./modules/gestion-usuarios/rol/rol.repository.js";
import { RolService } from "./modules/gestion-usuarios/rol/rol.service.js";
import { UsuarioRepository } from "./modules/gestion-usuarios/usuario/usuario.repository.js";
import { UsuarioService } from "./modules/gestion-usuarios/usuario/usuario.service.js";
import { ActividadRepository } from "./modules/gestion-servicio-entrenamiento/actividad/actividad.repository.js";
import { ActividadService } from "./modules/gestion-servicio-entrenamiento/actividad/actividad.service.js";
import { GestionServicioEntrenamientoService } from "./modules/gestion-servicio-entrenamiento/gestion-servicio-entrenamiento.service.js";
import { ProfesorRepository } from "./modules/gestion-personas/profesor/profesor.repository.js";
import { ProfesorService } from "./modules/gestion-personas/profesor/profesor.service.js";
import { GestionPersonasService } from "./modules/gestion-personas/gestion-personas.service.js";
import { HorarioRepository } from "./modules/gestion-servicio-entrenamiento/horario/horario.repository.js";
import { HorarioService } from "./modules/gestion-servicio-entrenamiento/horario/horario.service.js";
import { CONFIGURACION_DOCUMENTO_API, registrarDocumentacionApi } from "./openapi.js";
import { opcionesDelClientePrisma } from "./shared/db/client.js";
import { leerOrigenesPermitidos } from "./shared/utils/origenes-permitidos.js";
import type { DocumentoOpenApi } from "./shared/openapi/registro.js";

// Composition root: único lugar donde se instancian las clases concretas.
const prisma = new PrismaClient(opcionesDelClientePrisma(process.env.NODE_ENV));

const rolService = new RolService(new RolRepository(prisma));
const usuarioService = new UsuarioService(new UsuarioRepository(prisma), rolService);

const googleClientId = process.env.GOOGLE_CLIENT_ID as string;
const googleAutenticacion = new GoogleAutenticacion(new OAuth2Client(googleClientId), googleClientId);
const jwtService = new JwtService(process.env.JWT_SECRET as string, process.env.JWT_EXPIRES_IN ?? "8h");
const autenticacion = new SesionService(usuarioService, googleAutenticacion, jwtService, rolService);

const gestionUsuarios = new GestionUsuariosService(usuarioService, autenticacion, rolService);

const actividadService = new ActividadService(new ActividadRepository(prisma));
const profesorService = new ProfesorService(new ProfesorRepository(prisma), usuarioService, rolService);
const horarioService = new HorarioService(new HorarioRepository(prisma), actividadService, profesorService);
const gestionServicioEntrenamiento = new GestionServicioEntrenamientoService(
  actividadService,
  horarioService,
);
const gestionPersonas = new GestionPersonasService(profesorService, horarioService);

function generarDocumentacionApi(loginDesarrollo: boolean): DocumentoOpenApi {
  const registro = new OpenAPIRegistry();
  registrarDocumentacionApi(registro, { loginDesarrollo });
  return new OpenApiGeneratorV3(registro.definitions).generateDocument(CONFIGURACION_DOCUMENTO_API);
}

const esProduccion = process.env.NODE_ENV === "production";
const origenesPermitidos = leerOrigenesPermitidos(process.env.CORS_ORIGENES);

// En producción no se arranca con CORS abierto: mejor fallar al inicio que publicar la API a cualquier origen.
if (esProduccion && !origenesPermitidos) {
  console.error("Falta CORS_ORIGENES: con NODE_ENV=production hay que indicar los orígenes permitidos");
  process.exit(1);
}

const loginDesarrollo = process.env.LOGIN_DESARROLLO === "true";

// El login de desarrollo entra sin verificar la identidad con Google: en producción sería
// una puerta abierta, así que el proceso no arranca.
if (esProduccion && loginDesarrollo) {
  console.error("LOGIN_DESARROLLO=true no está permitido con NODE_ENV=production");
  process.exit(1);
}
if (loginDesarrollo) {
  console.warn("LOGIN_DESARROLLO activo: POST /api/v1/auth/desarrollo permite entrar sin Google");
}

const app = createApp(
  {
    gestionUsuarios,
    gestionPersonas,
    gestionServicioEntrenamiento,
    autenticacion,
    autorizacion: rolService,
  },
  {
    documentacionApi: esProduccion ? undefined : generarDocumentacionApi(loginDesarrollo),
    origenesPermitidos,
    loginDesarrollo,
  },
);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
