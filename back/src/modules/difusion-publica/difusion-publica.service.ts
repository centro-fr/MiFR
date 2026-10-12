import type { ILogicaDifusionPublica } from "./interface/i-logica-difusion-publica.js";
import type { PanelDisponibilidadService } from "./panel-disponibilidad/panel-disponibilidad.service.js";
import type { PanelDisponibilidad } from "./panel-disponibilidad/panel-disponibilidad.types.js";

// Realiza ILogicaDifusionPublica pasando cada operación a su componente.
export class DifusionPublicaService implements ILogicaDifusionPublica {
  constructor(private readonly panel: PanelDisponibilidadService) {}

  consultarDisponibilidad(): Promise<PanelDisponibilidad> {
    return this.panel.consultar();
  }
}
