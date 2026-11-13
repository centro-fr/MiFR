import { z } from "zod";
import { apiClient } from "@/api/client";

// GET /notificaciones/push/clave-publica, POST /notificaciones/push/suscripciones y .../baja
// (suscripcion-push.openapi.ts del back). Solo piden sesión: el dueño del dispositivo sale de ella.

const clavePublicaSchema = z.object({ clave_publica: z.string().nullable() });

/** La clave VAPID que el navegador necesita para suscribirse; null si el push no está configurado. */
export async function obtenerClavePushPublica(): Promise<string | null> {
  const { data } = await apiClient.get("/notificaciones/push/clave-publica");
  return clavePublicaSchema.parse(data).clave_publica;
}

/** La suscripción tal como la entrega el navegador (PushSubscription.toJSON()). */
export async function suscribirDispositivo(suscripcion: PushSubscriptionJSON): Promise<void> {
  await apiClient.post("/notificaciones/push/suscripciones", suscripcion);
}

export async function darDeBajaDispositivo(endpoint: string): Promise<void> {
  await apiClient.post("/notificaciones/push/suscripciones/baja", { endpoint });
}
