import type { DatosSuscripcion, ResultadoEnvioPush } from "../suscripcion-push.types.js";

// Interfaz del servicio externo de push (FCM, APNs, Mozilla) en la vista arquitectónica. La realiza el
// adaptador de la librería web-push (patrones.md): SuscripcionPush no conoce la librería.
export interface IServicioWebPush {
  // Cifra el contenido para ese dispositivo y lo entrega. Lanza ante cualquier error que no sea un
  // dispositivo que ya no existe.
  enviar(suscripcion: DatosSuscripcion, contenido: string): Promise<ResultadoEnvioPush>;
}
