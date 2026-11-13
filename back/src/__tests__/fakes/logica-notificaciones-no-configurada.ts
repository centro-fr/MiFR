import type { ILogicaNotificaciones } from "../../modules/gestion-notificaciones/interface/i-logica-notificaciones.js";

async function operacionNoConfigurada(): Promise<never> {
  throw new Error("La lógica de notificaciones no está configurada para este test");
}

export const logicaNotificacionesNoConfigurada = {
  listarNotificacionesPropias: operacionNoConfigurada,
  marcarNotificacionLeida: operacionNoConfigurada,
  marcarNotificacionesLeidas: operacionNoConfigurada,
  obtenerClavePushPublica: () => {
    throw new Error("La lógica de notificaciones no está configurada para este test");
  },
  suscribirDispositivo: operacionNoConfigurada,
  desuscribirDispositivo: operacionNoConfigurada,
} satisfies ILogicaNotificaciones;
