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
import { leerConfiguracion } from "./shared/utils/configuracion.js";
import type { DocumentoOpenApi } from "./shared/openapi/registro.js";

// Composition root junto con composicion.ts: lee el entorno, crea las piezas de infraestructura
// (base, Google, JWT) y levanta el servidor.
const resultado = leerConfiguracion(process.env);
if (!resultado.valida) {
  for (const error of resultado.errores) console.error(error);
  process.exit(1);
}
const { configuracion } = resultado;

const prisma = new PrismaClient(opcionesDelClientePrisma(process.env.NODE_ENV));
const dependencias = construirDependencias({
  prisma,
  googleAuth: new GoogleAutenticacion(
    new OAuth2Client(configuracion.googleClientId),
    configuracion.googleClientId ?? "",
  ),
  jwtService: new JwtService(configuracion.jwtSecret, configuracion.jwtExpiresIn),
});

function generarDocumentacionApi(loginDesarrollo: boolean): DocumentoOpenApi {
  const registro = new OpenAPIRegistry();
  registrarDocumentacionApi(registro, { loginDesarrollo });
  return new OpenApiGeneratorV3(registro.definitions).generateDocument(CONFIGURACION_DOCUMENTO_API);
}

const { esProduccion, loginDesarrollo, origenesPermitidos, host, port } = configuracion;
if (loginDesarrollo) {
  console.warn("LOGIN_DESARROLLO activo: POST /api/v1/auth/desarrollo permite entrar sin Google");
}
if (!configuracion.googleClientId) {
  console.warn("GOOGLE_CLIENT_ID no está configurado: el login con Google va a rechazar todos los tokens");
}

const app = createApp(dependencias, {
  documentacionApi: esProduccion ? undefined : generarDocumentacionApi(loginDesarrollo),
  origenesPermitidos,
  loginDesarrollo,
});

app.listen(port, host, () => {
  console.log(`API escuchando en http://${host}:${port}`);
});
