import type { RequestOptions } from "web-push";
import type { IServicioWebPush } from "./interface/i-servicio-web-push.js";
import type { DatosSuscripcion, ResultadoEnvioPush } from "./suscripcion-push.types.js";

// Las claves VAPID identifican a MiFR ante los servicios de push. El contacto (mailto: o https:) es a
// quién avisarle si hay un problema con los envíos.
export interface ConfiguracionVapid {
  clavePublica: string;
  clavePrivada: string;
  contacto: string;
}

// sendNotification de web-push: la recibe por constructor, así solo el composition root conoce la
// librería y los tests no salen a la red.
export type EnviarNotificacion = (
  suscripcion: DatosSuscripcion,
  contenido: string,
  opciones: RequestOptions,
) => Promise<unknown>;

// 404 y 410 son la forma en que el servicio de push dice que ese dispositivo ya no existe.
const DISPOSITIVO_INEXISTENTE = new Set([404, 410]);
// Un aviso de cuota sigue valiendo unos días: si el celular está apagado, el servicio lo guarda.
const VIGENCIA_DEL_AVISO_SEGUNDOS = 3 * 24 * 60 * 60;
const ESPERA_MAXIMA_MS = 10_000;

function codigoHttp(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return null;
  const { statusCode } = error as { statusCode: unknown };
  return typeof statusCode === "number" ? statusCode : null;
}

// Adaptador de web-push (patrones.md, Adapter): realiza IServicioWebPush.
export class WebPushServicio implements IServicioWebPush {
  constructor(
    private readonly enviarNotificacion: EnviarNotificacion,
    private readonly vapid: ConfiguracionVapid,
  ) {}

  async enviar(suscripcion: DatosSuscripcion, contenido: string): Promise<ResultadoEnvioPush> {
    try {
      await this.enviarNotificacion(suscripcion, contenido, {
        vapidDetails: {
          subject: this.vapid.contacto,
          publicKey: this.vapid.clavePublica,
          privateKey: this.vapid.clavePrivada,
        },
        TTL: VIGENCIA_DEL_AVISO_SEGUNDOS,
        timeout: ESPERA_MAXIMA_MS,
      });
      return "ENTREGADO";
    } catch (error) {
      const codigo = codigoHttp(error);
      if (codigo !== null && DISPOSITIVO_INEXISTENTE.has(codigo)) return "VENCIDA";
      // El error de web-push trae el endpoint, que funciona como una credencial del dispositivo: al
      // log va solo el código.
      throw new Error(`El servicio de push rechazó el aviso (${codigo ?? "sin respuesta"})`);
    }
  }
}
