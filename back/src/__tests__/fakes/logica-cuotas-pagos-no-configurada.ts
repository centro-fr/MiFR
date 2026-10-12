import type { ILogicaCuotasPagos } from "../../modules/gestion-cuotas-y-pagos/interface/i-logica-cuotas-pagos.js";

async function operacionNoConfigurada(): Promise<never> {
  throw new Error("La lógica de cuotas y pagos no está configurada para este test");
}

export const logicaCuotasPagosNoConfigurada = {
  registrarCobroEfectivo: operacionNoConfigurada,
  informarTransferencia: operacionNoConfigurada,
  registrarTransferenciaRecibida: operacionNoConfigurada,
  aprobarTransferencia: operacionNoConfigurada,
  rechazarTransferencia: operacionNoConfigurada,
  listarTransferencias: operacionNoConfigurada,
  listarMisTransferencias: operacionNoConfigurada,
  obtenerComprobante: operacionNoConfigurada,
} satisfies ILogicaCuotasPagos;
