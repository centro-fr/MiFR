import { NotFoundError } from "../../../shared/errors/app-error.js";
import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";
import type { IEnvioPush } from "../suscripcion-push/interface/i-envio-push.js";
import type { AvisoPush } from "../suscripcion-push/suscripcion-push.types.js";
import type { IRegistroNotificaciones } from "./interface/i-registro-notificaciones.js";
import type { NotificacionRepository } from "./notificacion.repository.js";
import type {
  NotificacionPropia,
  NuevaNotificacion,
  PaginaNotificaciones,
  TipoNotificacion,
} from "./notificacion.types.js";

// Los avisos que llegan además al celular (arquitectura.md, avisos push), con su título. La bienvenida
// queda solo en la campana.
const TITULO_DEL_PUSH: Partial<Record<TipoNotificacion, string>> = {
  CUOTA_POR_VENCER: "Cuota por vencer",
  CUOTA_VENCIDA: "Cuota vencida",
};

// El inicio de quien recibe el aviso de cuota, donde está su cuota (como el botón de la campana).
const PANTALLA_DE_LA_CUOTA = "/app/inicio";

function avisoPush(notificacion: NuevaNotificacion, titulo: string): AvisoPush {
  return {
    titulo,
    cuerpo: notificacion.mensaje,
    url: PANTALLA_DE_LA_CUOTA,
    etiqueta: `cuota-${notificacion.id_cuota}`,
  };
}

// Componente Notificacion de la vista arquitectónica (GestionNotificaciones). Guarda los avisos que
// generan los procesos del subsistema y se los muestra a su destinatario, que es el único que los ve y
// los marca leídos. El aviso in-app es la fuente; los de cuota además se mandan al celular por push,
// sin estado ni reintento (arquitectura.md).
export class NotificacionService implements IRegistroNotificaciones {
  constructor(
    private readonly repositorio: NotificacionRepository,
    private readonly envioPush: IEnvioPush,
  ) {}

  async registrar(notificaciones: NuevaNotificacion[]): Promise<number> {
    const nuevas = await this.repositorio.registrar(notificaciones, new Date());
    await Promise.all(
      nuevas.flatMap((notificacion) => {
        const titulo = TITULO_DEL_PUSH[notificacion.tipo];
        return titulo
          ? [this.envioPush.enviarAUsuario(notificacion.id_usuario, avisoPush(notificacion, titulo))]
          : [];
      }),
    );
    return nuevas.length;
  }

  async listarDeUsuario(idUsuario: number, paginacion: Paginacion): Promise<PaginaNotificaciones> {
    return { ...(await this.repositorio.listarDeUsuario(idUsuario, paginacion)), ...paginacion };
  }

  // Una notificación de otra persona responde 404, igual que una que no existe (seguridad.md, regla 3).
  async marcarLeida(idNotificacion: number, idUsuario: number): Promise<NotificacionPropia> {
    const notificacion = await this.repositorio.marcarLeida(idNotificacion, idUsuario);
    if (!notificacion) throw new NotFoundError("Notificación no encontrada");
    return notificacion;
  }

  async marcarTodasLeidas(idUsuario: number): Promise<{ marcadas: number }> {
    return { marcadas: await this.repositorio.marcarTodasLeidas(idUsuario) };
  }
}
