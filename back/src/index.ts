import "dotenv/config";
import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import webpush from "web-push";
import { createApp } from "./app.js";
import { construirSistema } from "./composicion.js";
import { WebPushServicio } from "./modules/gestion-notificaciones/suscripcion-push/web-push-servicio.js";
import { GoogleAutenticacion } from "./modules/gestion-usuarios/sesion/google-autenticacion.js";
import { JwtService } from "./modules/gestion-usuarios/sesion/jwt.service.js";
import { CONFIGURACION_DOCUMENTO_API, registrarDocumentacionApi } from "./openapi.js";
import { opcionesDelClientePrisma } from "./shared/db/client.js";
import { LIMITES_DE_PEDIDOS } from "./shared/middlewares/limite-pedidos.js";
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
const {
  dependencias,
  cierreAsistencia,
  aplicadorProgramados,
  planificadorNotificaciones,
  cierreMensualInsignias,
  cierreMensualHonorarios,
} = construirSistema({
  prisma,
  googleAuth: new GoogleAutenticacion(
    new OAuth2Client(configuracion.googleClientId),
    configuracion.googleClientId ?? "",
  ),
  jwtService: new JwtService(configuracion.jwtSecret, configuracion.jwtExpiresIn),
  push: configuracion.push && {
    servicio: new WebPushServicio(
      (suscripcion, contenido, opciones) => webpush.sendNotification(suscripcion, contenido, opciones),
      configuracion.push,
    ),
    clavePublica: configuracion.push.clavePublica,
  },
});

// US-21: Render duerme el proceso sin tráfico, así que esto no es la única vía de cierre; las rutas
// de clases también cierran las ventanas vencidas al leerlas (decisión de SPRINT-3.md). unref() no
// deja vivo el proceso solo por el intervalo.
const MILISEGUNDOS_ENTRE_CIERRES = 60_000;
setInterval(() => {
  cierreAsistencia.procesarCierresAutomaticos().catch((error: unknown) => {
    console.error("No se pudieron cerrar las asistencias vencidas", error);
  });
}, MILISEGUNDOS_ENTRE_CIERRES).unref();

// US-25: con el mismo enfoque, los avisos de cuota también se generan al consultar las notificaciones
// propias. Corren a lo sumo una vez por día; el intervalo solo hace falta para cambiar de día.
const MILISEGUNDOS_ENTRE_AVISOS = 60 * 60_000;
setInterval(() => {
  planificadorNotificaciones.generarAvisosDelDia().catch((error: unknown) => {
    console.error("No se pudieron generar los avisos de cuota", error);
  });
}, MILISEGUNDOS_ENTRE_AVISOS).unref();

// US-14 y US-04: el cambio de plan y la salida de un horario con la baja programada se aplican al
// terminar la gracia. Corre a lo sumo una vez por día; el intervalo solo hace falta para cambiar de día.
setInterval(() => {
  aplicadorProgramados
    .aplicarDelDia()
    .then((resultado) => {
      for (const error of resultado?.errores ?? [])
        console.error("No se pudo aplicar algo programado", error);
    })
    .catch((error: unknown) => {
      console.error("No se pudo aplicar lo programado del día", error);
    });
}, MILISEGUNDOS_ENTRE_AVISOS).unref();

// US-31: con el mismo enfoque, el mes anterior se cierra también al consultar la ficha de insignias o el
// ranking. Corre a lo sumo una vez por mes; el intervalo solo hace falta para cambiar de mes.
setInterval(() => {
  cierreMensualInsignias.cerrarMesAnterior().catch((error: unknown) => {
    console.error("No se pudo cerrar el mes de las insignias", error);
  });
}, MILISEGUNDOS_ENTRE_AVISOS).unref();

// US-23: con el mismo enfoque, el mes anterior de honorarios se cierra también al listar las
// liquidaciones. Corre a lo sumo una vez por mes, desde DIA_CIERRE_HONORARIOS.
setInterval(() => {
  cierreMensualHonorarios.cerrarMesAnterior().catch((error: unknown) => {
    console.error("No se pudo cerrar el mes de los honorarios", error);
  });
}, MILISEGUNDOS_ENTRE_AVISOS).unref();

function generarDocumentacionApi(loginDesarrollo: boolean): DocumentoOpenApi {
  const registro = new OpenAPIRegistry();
  registrarDocumentacionApi(registro, { loginDesarrollo });
  return new OpenApiGeneratorV3(registro.definitions).generateDocument(CONFIGURACION_DOCUMENTO_API);
}

const {
  esProduccion,
  loginDesarrollo,
  origenesPermitidos,
  proxiesDeConfianza,
  firmaProxyNetlify,
  host,
  port,
} = configuracion;
if (loginDesarrollo) {
  console.warn("LOGIN_DESARROLLO activo: POST /api/v1/auth/desarrollo permite entrar sin Google");
}
if (!configuracion.push) {
  console.warn("Sin claves VAPID: los avisos de cuota no se mandan por push");
}
if (!configuracion.googleClientId) {
  console.warn("GOOGLE_CLIENT_ID no está configurado: el login con Google va a rechazar todos los tokens");
}

const app = createApp(dependencias, {
  documentacionApi: esProduccion ? undefined : generarDocumentacionApi(loginDesarrollo),
  origenesPermitidos,
  loginDesarrollo,
  limitesDePedidos: LIMITES_DE_PEDIDOS,
  proxiesDeConfianza,
  firmaProxyNetlify,
});

app.listen(port, host, () => {
  console.log(`API escuchando en http://${host}:${port}`);
});
