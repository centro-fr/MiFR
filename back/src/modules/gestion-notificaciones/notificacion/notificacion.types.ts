import type { notificaciones, tipo_notificacion } from "@prisma/client";

export type Notificacion = notificaciones;
export type TipoNotificacion = tipo_notificacion;

// Lo que decide quien genera el aviso. El estado de envío y las fechas los pone Notificacion: los
// avisos son in-app y nacen enviados (arquitectura.md).
export interface NuevaNotificacion {
  id_usuario: number;
  tipo: TipoNotificacion;
  // Solo en los avisos de cuota: con el usuario y el tipo, es el único que evita duplicarlos.
  id_cuota: number | null;
  mensaje: string;
}

// Una notificación como la ve su destinatario: sin el estado de envío, que hoy es siempre ENVIADA.
export type NotificacionPropia = Pick<
  Notificacion,
  "id_notificacion" | "tipo" | "id_cuota" | "mensaje" | "fecha_generacion" | "leida"
>;

export interface PaginaNotificaciones {
  datos: NotificacionPropia[];
  total: number;
  no_leidas: number;
  limit: number;
  offset: number;
}
