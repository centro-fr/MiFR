import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "../../../shared/utils/zod.js";
import {
  cuerpoJson,
  respuestaJson,
  respuestasDeError,
  SEGURIDAD_BEARER,
} from "../../../shared/openapi/registro.js";
import { bajaSuscripcionPushSchema, suscripcionPushSchema } from "./suscripcion-push.schemas.js";

export function registrarDocumentacionSuscripcionesPush(registro: OpenAPIRegistry): void {
  const tags = ["Notificaciones"];
  const security = SEGURIDAD_BEARER;
  const soloSesion = "Requiere sesión, con cualquier rol: cada persona maneja solo sus dispositivos.";

  registro.registerPath({
    method: "get",
    path: "/notificaciones/push/clave-publica",
    tags,
    security,
    summary: "Clave pública para suscribir el dispositivo a los avisos push (US-25)",
    description: `${soloSesion} La clave VAPID que el navegador necesita para suscribirse. null si el push no está configurado.`,
    responses: {
      200: respuestaJson(
        "La clave pública, en base64url",
        z.object({ clave_publica: z.string().nullable() }).openapi("ClavePushPublica"),
      ),
      ...respuestasDeError(401),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/notificaciones/push/suscripciones",
    tags,
    security,
    summary: "Recibir los avisos de cuota en este dispositivo",
    description:
      `${soloSesion} Guarda la suscripción del navegador (PushSubscription.toJSON()). El endpoint tiene ` +
      "que ser de un servicio de push conocido (Google, Mozilla, Apple o Microsoft), por HTTPS. Si el " +
      "dispositivo ya estaba suscripto, por esta u otra cuenta, pasa a quien pide.",
    request: { body: cuerpoJson(suscripcionPushSchema) },
    responses: { 204: { description: "Dispositivo suscripto" }, ...respuestasDeError(400, 401) },
  });

  registro.registerPath({
    method: "post",
    path: "/notificaciones/push/suscripciones/baja",
    tags,
    security,
    summary: "Dejar de recibir los avisos en este dispositivo",
    description: `${soloSesion} Un dispositivo ajeno o que no existe no cambia nada y responde igual.`,
    request: { body: cuerpoJson(bajaSuscripcionPushSchema) },
    responses: { 204: { description: "Dispositivo dado de baja" }, ...respuestasDeError(400, 401) },
  });
}
