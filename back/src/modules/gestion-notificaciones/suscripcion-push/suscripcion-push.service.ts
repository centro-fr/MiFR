import { registrarError } from "../../../shared/utils/registro-errores.js";
import type { IEnvioPush } from "./interface/i-envio-push.js";
import type { IServicioWebPush } from "./interface/i-servicio-web-push.js";
import type { SuscripcionPushRepository } from "./suscripcion-push.repository.js";
import type { AvisoPush, DatosSuscripcion, SuscripcionPush } from "./suscripcion-push.types.js";

// Componente SuscripcionPush de la vista arquitectónica (GestionNotificaciones): guarda qué dispositivos
// recibe cada persona y les entrega los avisos de cuota con IServicioWebPush (arquitectura.md, avisos
// push). Sin claves VAPID configuradas (desarrollo) no hay servicio: guarda igual y no manda nada.
export class SuscripcionPushService implements IEnvioPush {
  constructor(
    private readonly repositorio: SuscripcionPushRepository,
    private readonly servicio: IServicioWebPush | null,
    private readonly clave: string | null,
  ) {}

  // La que el navegador necesita para suscribirse; null si el push no está configurado.
  clavePublica(): string | null {
    return this.clave;
  }

  async suscribir(idUsuario: number, datos: DatosSuscripcion): Promise<void> {
    await this.repositorio.guardar(idUsuario, datos);
  }

  // Dar de baja un dispositivo ajeno o que no existe no hace nada y no lo informa: la respuesta no dice
  // nada de los dispositivos de otros.
  desuscribir(idUsuario: number, endpoint: string): Promise<void> {
    return this.repositorio.borrarDeUsuario(idUsuario, endpoint);
  }

  async enviarAUsuario(idUsuario: number, aviso: AvisoPush): Promise<void> {
    if (this.servicio === null) return;
    try {
      const suscripciones = await this.repositorio.listarDeUsuario(idUsuario);
      const contenido = JSON.stringify(aviso);
      await Promise.all(suscripciones.map((suscripcion) => this.entregar(suscripcion, contenido)));
    } catch (error) {
      registrarError("AVISO_PUSH", error);
    }
  }

  // Cada dispositivo por su cuenta: que uno falle no deja sin aviso a los demás.
  private async entregar(suscripcion: SuscripcionPush, contenido: string): Promise<void> {
    try {
      const resultado = await (this.servicio as IServicioWebPush).enviar(
        {
          endpoint: suscripcion.endpoint,
          keys: { p256dh: suscripcion.clave_p256dh, auth: suscripcion.clave_auth },
        },
        contenido,
      );
      if (resultado === "VENCIDA") await this.repositorio.borrar(suscripcion.endpoint);
    } catch (error) {
      registrarError("AVISO_PUSH", error);
    }
  }
}
