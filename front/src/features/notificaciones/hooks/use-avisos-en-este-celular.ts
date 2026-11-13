import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mensajeDeErrorApi } from "@/api/errores";
import { obtenerClavePushPublica, suscribirDispositivo } from "@/features/notificaciones/api/push-api";
import {
  abiertaComoApp,
  claveEnBytes,
  darDeBajaEsteDispositivo,
  esIphone,
  navegadorSoportaPush,
  suscripcionDeEsteDispositivo,
} from "@/features/notificaciones/utils/push";

export type EstadoAvisosPush =
  | "cargando"
  | "no-soportado"
  // iPhone en Safari: el push existe solo con MiFR agregado a la pantalla de inicio.
  | "instalar-primero"
  // El back no tiene claves VAPID (desarrollo) o no se pudo consultar.
  | "no-disponible"
  // La persona rechazó el permiso: solo lo puede cambiar desde la configuración del navegador.
  | "bloqueado"
  | "activos"
  | "inactivos";

// Un problema que la persona puede resolver, con su mensaje. Los demás (la API, el servicio de push del
// navegador) se muestran con un texto general: los del navegador vienen en inglés y no ayudan.
class AvisoPushError extends Error {}

function mensajeDelError(error: Error | null): string | null {
  if (error === null) return null;
  if (error instanceof AvisoPushError) return error.message;
  return mensajeDeErrorApi(error, "No pudimos cambiar los avisos de este celular. Probá de nuevo.");
}

const CLAVE_QUERY_KEY = ["push", "clave-publica"] as const;
const SUSCRIPCION_QUERY_KEY = ["push", "suscripcion-de-este-dispositivo"] as const;

function estadoSinSoporte(): EstadoAvisosPush {
  return esIphone() && !abiertaComoApp() ? "instalar-primero" : "no-soportado";
}

// El service worker lo registra main.tsx solo en el build publicado: sin él no hay a quién suscribir.
async function registroDelServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registro = await navigator.serviceWorker.getRegistration();
  if (!registro) throw new AvisoPushError("Los avisos en el celular están disponibles en la versión publicada de MiFR.");
  return registro;
}

async function activar(clave: string): Promise<void> {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new AvisoPushError("Sin el permiso de notificaciones no podemos avisarte en este celular.");
  const registro = await registroDelServiceWorker();
  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: claveEnBytes(clave),
  });
  await suscribirDispositivo(suscripcion.toJSON());
}

/** Si este dispositivo recibe los avisos de cuota por push, y cómo activarlos o desactivarlos. */
export function useAvisosEnEsteCelular() {
  const soporta = navegadorSoportaPush();
  const queryClient = useQueryClient();
  const clave = useQuery({
    queryKey: CLAVE_QUERY_KEY,
    queryFn: obtenerClavePushPublica,
    enabled: soporta,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const suscripcion = useQuery({
    queryKey: SUSCRIPCION_QUERY_KEY,
    queryFn: async () => (await suscripcionDeEsteDispositivo()) !== null,
    enabled: soporta,
  });
  const refrescar = () => queryClient.invalidateQueries({ queryKey: SUSCRIPCION_QUERY_KEY });
  const activacion = useMutation({ mutationFn: () => activar(clave.data as string), onSettled: refrescar });
  const desactivacion = useMutation({ mutationFn: darDeBajaEsteDispositivo, onSettled: refrescar });

  let estado: EstadoAvisosPush;
  if (!soporta) estado = estadoSinSoporte();
  else if (clave.isPending || suscripcion.isPending) estado = "cargando";
  else if (clave.isError || !clave.data) estado = "no-disponible";
  else if (Notification.permission === "denied") estado = "bloqueado";
  else estado = suscripcion.data ? "activos" : "inactivos";

  return {
    estado,
    activar: () => activacion.mutate(),
    desactivar: () => desactivacion.mutate(),
    procesando: activacion.isPending || desactivacion.isPending,
    error: mensajeDelError(activacion.error ?? desactivacion.error),
  };
}
