import { darDeBajaDispositivo } from "@/features/notificaciones/api/push-api";

// Lo que el navegador tiene que tener para recibir push: un service worker, el PushManager y el
// permiso de notificaciones.
export function navegadorSoportaPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// En iPhone el push existe solo con MiFR agregado a la pantalla de inicio (iOS 16.4 o posterior).
export function esIphone(agente: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/.test(agente);
}

export function abiertaComoApp(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

/** La clave VAPID llega en base64url; PushManager.subscribe la pide en bytes. */
export function claveEnBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/** La suscripción de este dispositivo, si el service worker está registrado y la tiene. */
export async function suscripcionDeEsteDispositivo(): Promise<PushSubscription | null> {
  if (!navegadorSoportaPush()) return null;
  const registro = await navigator.serviceWorker.getRegistration();
  return (await registro?.pushManager.getSubscription()) ?? null;
}

/**
 * Al cerrar sesión: el celular deja de recibir los avisos de esta cuenta, para que no le lleguen a la
 * próxima persona que lo use. Primero el back (todavía con el token) y después el navegador.
 */
export async function darDeBajaEsteDispositivo(): Promise<void> {
  const suscripcion = await suscripcionDeEsteDispositivo();
  if (!suscripcion) return;
  await darDeBajaDispositivo(suscripcion.endpoint);
  await suscripcion.unsubscribe();
}
