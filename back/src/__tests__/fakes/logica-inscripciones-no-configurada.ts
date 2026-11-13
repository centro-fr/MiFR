import type { ILogicaInscripcionesYClases } from "../../modules/gestion-inscripciones-y-clases/interface/i-logica-inscripciones-y-clases.js";

async function operacionNoConfigurada(): Promise<never> {
  throw new Error("La lógica de inscripciones no está configurada para este test");
}

export const logicaInscripcionesNoConfigurada = {
  crearInscripcion: operacionNoConfigurada,
  preinscribir: operacionNoConfigurada,
  listarInscripciones: operacionNoConfigurada,
  obtenerInscripcion: operacionNoConfigurada,
  darDeBajaAlumno: operacionNoConfigurada,
  reactivarAlumno: operacionNoConfigurada,
  cambiarPlan: operacionNoConfigurada,
  cancelarCambioPlan: operacionNoConfigurada,
  actualizarHorarios: operacionNoConfigurada,
  listarClasesDeHoy: operacionNoConfigurada,
  obtenerAsistenciaDeClase: operacionNoConfigurada,
  marcarAsistencia: operacionNoConfigurada,
  marcarTodosPresentes: operacionNoConfigurada,
  cerrarAsistencia: operacionNoConfigurada,
  listarClasesDeFecha: operacionNoConfigurada,
  cancelarClase: operacionNoConfigurada,
  listarSuplencias: operacionNoConfigurada,
  registrarSuplencia: operacionNoConfigurada,
  cambiarSuplencia: operacionNoConfigurada,
  eliminarSuplencia: operacionNoConfigurada,
} satisfies ILogicaInscripcionesYClases;
