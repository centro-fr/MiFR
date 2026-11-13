import type { suscripciones_push } from "@prisma/client";

export type SuscripcionPush = suscripciones_push;

// Lo que el navegador entrega al suscribirse (PushSubscription.toJSON()): adónde mandar el aviso y las
// claves con las que se cifra, que solo puede descifrar ese dispositivo.
export interface DatosSuscripcion {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Lo que muestra el celular. El texto es el del aviso in-app: completo, para entenderse desde la
// pantalla de bloqueo. La etiqueta hace que un aviso nuevo de la misma cuota reemplace al anterior.
export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  url: string;
  etiqueta: string;
}

// VENCIDA: el servicio de push dice que el dispositivo ya no existe (404 o 410) y hay que olvidarlo.
export type ResultadoEnvioPush = "ENTREGADO" | "VENCIDA";
