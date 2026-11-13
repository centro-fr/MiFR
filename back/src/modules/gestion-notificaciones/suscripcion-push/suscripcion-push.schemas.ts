import { z } from "../../../shared/utils/zod.js";

// El servidor manda un pedido HTTP a este endpoint: sin una lista cerrada, cualquiera con sesión podría
// hacer que la API pegue a una dirección interna (SSRF). Son los servicios de push de los navegadores:
// FCM (Chrome, Android, Samsung Internet), Mozilla (Firefox), Apple (Safari e iPhone) y WNS (Edge).
const SERVICIO_DE_PUSH =
  /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;

function esEndpointDePush(valor: string): boolean {
  try {
    const url = new URL(valor);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      SERVICIO_DE_PUSH.test(url.hostname)
    );
  } catch {
    return false;
  }
}

const endpointSchema = z
  .string()
  .max(1000)
  .refine(esEndpointDePush, "Tiene que ser la dirección de un servicio de push de un navegador")
  .openapi({ example: "https://fcm.googleapis.com/fcm/send/c1KrmpTuRm0" });

// Base64url, como las entrega PushSubscription.toJSON(). p256dh es una clave pública de 65 bytes y
// auth un secreto de 16; los topes son los de las columnas.
const claveSchema = (minimo: number, maximo: number) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]+={0,2}$/, "Tiene que estar en base64url")
    .min(minimo)
    .max(maximo);

export const suscripcionPushSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: claveSchema(80, 200), auth: claveSchema(16, 100) }),
});

export const bajaSuscripcionPushSchema = z.object({ endpoint: endpointSchema });

export type SuscripcionPushBody = z.infer<typeof suscripcionPushSchema>;
export type BajaSuscripcionPushBody = z.infer<typeof bajaSuscripcionPushSchema>;
