import "dotenv/config";
import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { createApp } from "./app.js";
import { construirDependencias } from "./composicion.js";
import { GoogleAutenticacion } from "./modules/gestion-usuarios/sesion/google-autenticacion.js";
import { JwtService } from "./modules/gestion-usuarios/sesion/jwt.service.js";
import { CONFIGURACION_DOCUMENTO_API, registrarDocumentacionApi } from "./openapi.js";
import { opcionesDelClientePrisma } from "./shared/db/client.js";
import { leerOrigenesPermitidos } from "./shared/utils/origenes-permitidos.js";
import type { DocumentoOpenApi } from "./shared/openapi/registro.js";

// Composition root junto con composicion.ts: lee el entorno, crea las piezas de infraestructura
// (base, Google, JWT) y levanta el servidor.
const prisma = new PrismaClient(opcionesDelClientePrisma(process.env.NODE_ENV));
const googleClientId = process.env.GOOGLE_CLIENT_ID as string;
const dependencias = construirDependencias({
  prisma,
  googleAuth: new GoogleAutenticacion(new OAuth2Client(googleClientId), googleClientId),
  jwtService: new JwtService(process.env.JWT_SECRET as string, process.env.JWT_EXPIRES_IN ?? "8h"),
});

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

const app = createApp(dependencias, {
  documentacionApi: esProduccion ? undefined : generarDocumentacionApi(loginDesarrollo),
  origenesPermitidos,
  loginDesarrollo,
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
