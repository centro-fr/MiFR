// Tabla notificaciones del DER, sin el estado de envío (in-app: siempre ENVIADA). En la base local
// (docker mifr-db) estaba vacía al 20/10/2026: los avisos los genera el mock como el back, al
// consultarlos (mocks/avisos.ts).

export type TipoNotificacionMock = "CUOTA_POR_VENCER" | "CUOTA_VENCIDA" | "RESUMEN_DIARIO" | "BIENVENIDA" | "CLASE_CANCELADA";

export interface NotificacionMock {
  id_notificacion: number;
  id_usuario: number;
  tipo: TipoNotificacionMock;
  id_cuota: number | null;
  id_alumno?: number | null;
  mensaje: string;
  fecha_generacion: string;
  leida: boolean;
}
