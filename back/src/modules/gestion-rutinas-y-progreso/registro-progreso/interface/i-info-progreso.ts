import type { MedicionInicial } from "../registro-progreso.types.js";

// Interfaz provista por RegistroProgreso (GestionRutinasYProgreso). La usa Inscripcion para guardar,
// junto con la pre-inscripción, el peso y la talla que pide una actividad con requiere_medidas
// (US-05). La carga de la evolución física por la profesora (US-27) va por ILogicaRutinas.
export interface IInfoProgreso {
  // Se suma a la transacción en curso: si la pre-inscripción falla, la medición no queda.
  registrarMedicionInicial(medicion: MedicionInicial): Promise<void>;
}
