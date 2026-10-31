import type { ILogicaRutinasYProgreso } from "../../modules/gestion-rutinas-y-progreso/interface/i-logica-rutinas-y-progreso.js";

async function operacionNoConfigurada(): Promise<never> {
  throw new Error("La lógica de rutinas y progreso no está configurada para este test");
}

export const logicaRutinasNoConfigurada = {
  crearRutina: operacionNoConfigurada,
  listarRutinasDeAlumno: operacionNoConfigurada,
  obtenerRutinaVigente: operacionNoConfigurada,
  registrarProgreso: operacionNoConfigurada,
  listarProgresoDeAlumno: operacionNoConfigurada,
  actualizarProgreso: operacionNoConfigurada,
  eliminarProgreso: operacionNoConfigurada,
  obtenerMiRutina: operacionNoConfigurada,
  listarMiRutinas: operacionNoConfigurada,
  listarMiProgreso: operacionNoConfigurada,
} satisfies ILogicaRutinasYProgreso;
