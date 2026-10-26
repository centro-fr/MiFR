import type { Solicitante } from "../../shared/utils/solicitante.types.js";
import type { ILogicaRutinasYProgreso } from "./interface/i-logica-rutinas-y-progreso.js";
import type { CrearRutinaInput } from "./rutina/rutina.schemas.js";
import type { RutinaService } from "./rutina/rutina.service.js";
import type { Rutina } from "./rutina/rutina.types.js";

// Realiza ILogicaRutinasYProgreso pasando cada operación al componente que corresponde.
export class GestionRutinasYProgresoService implements ILogicaRutinasYProgreso {
  constructor(private readonly rutinas: RutinaService) {}

  crearRutina(input: CrearRutinaInput, solicitante: Solicitante): Promise<Rutina> {
    return this.rutinas.crear(input, solicitante);
  }

  listarRutinasDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<Rutina[]> {
    return this.rutinas.listarDeAlumno(idAlumno, solicitante);
  }

  obtenerRutinaVigente(idAlumno: number, solicitante: Solicitante): Promise<Rutina | null> {
    return this.rutinas.obtenerVigente(idAlumno, solicitante);
  }
}