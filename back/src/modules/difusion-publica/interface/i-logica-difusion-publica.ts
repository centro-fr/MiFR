import type { PanelDisponibilidad } from "../panel-disponibilidad/panel-disponibilidad.types.js";

// La parte de ILogicaDifusionPublica que usa el controller de PanelDisponibilidad. No es una interfaz
// nueva del diagrama: la que provee el subsistema es la unión.
export interface ILogicaPanelDisponibilidad {
  consultarDisponibilidad(): Promise<PanelDisponibilidad>;
}

// Interfaz del subsistema DifusionPublica en la vista arquitectónica: la consume PanelPublicoPresWeb,
// la única parte de la presentación que no exige sesión. Por eso solo expone lectura y datos anónimos.
export interface ILogicaDifusionPublica extends ILogicaPanelDisponibilidad {}
