import type { AvisoPush } from "../suscripcion-push.types.js";

// Interfaz provista por SuscripcionPush (GestionNotificaciones) en la vista arquitectónica: Notificacion
// la usa para mandar al celular los avisos de cuota que acaba de guardar (arquitectura.md, avisos push).
export interface IEnvioPush {
  // A todos los dispositivos suscriptos del usuario. Nunca falla: el push es una copia del aviso in-app,
  // así que un error se registra en el log y no corta la generación del aviso.
  enviarAUsuario(idUsuario: number, aviso: AvisoPush): Promise<void>;
}
