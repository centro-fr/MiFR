import type { Solicitante } from "../../shared/utils/solicitante.types.js";
import type { ILogicaRutinasYProgreso } from "./interface/i-logica-rutinas-y-progreso.js";
import type { ActualizarProgresoInput, RegistrarProgresoInput } from "./progreso/progreso.schemas.js";
import type { ProgresoService } from "./progreso/progreso.service.js";
import type { RegistroDeProgreso } from "./progreso/progreso.types.js";
import type { ActualizarRutinaInput, CrearRutinaInput } from "./rutina/rutina.schemas.js";
import type { RutinaService } from "./rutina/rutina.service.js";
import type { Rutina } from "./rutina/rutina.types.js";

// Realiza ILogicaRutinasYProgreso pasando cada operación al componente que corresponde.
export class GestionRutinasYProgresoService implements ILogicaRutinasYProgreso {
  constructor(
    private readonly rutinas: RutinaService,
    private readonly progreso: ProgresoService,
  ) {}

  crearRutina(input: CrearRutinaInput, solicitante: Solicitante): Promise<Rutina> {
    return this.rutinas.crear(input, solicitante);
  }

  actualizarRutina(idRutina: number, input: ActualizarRutinaInput, solicitante: Solicitante): Promise<Rutina> {
    return this.rutinas.actualizar(idRutina, input, solicitante);
  }

  eliminarRutina(idRutina: number, solicitante: Solicitante): Promise<void> {
    return this.rutinas.eliminar(idRutina, solicitante);
  }

  listarRutinasDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<Rutina[]> {
    return this.rutinas.listarDeAlumno(idAlumno, solicitante);
  }

  obtenerRutinaVigente(idAlumno: number, solicitante: Solicitante): Promise<Rutina | null> {
    return this.rutinas.obtenerVigente(idAlumno, solicitante);
  }

  registrarProgreso(input: RegistrarProgresoInput, solicitante: Solicitante): Promise<RegistroDeProgreso> {
    return this.progreso.registrar(input, solicitante);
  }

  listarProgresoDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<RegistroDeProgreso[]> {
    return this.progreso.listarDeAlumno(idAlumno, solicitante);
  }

  actualizarProgreso(
    idRegistro: number,
    input: ActualizarProgresoInput,
    solicitante: Solicitante,
  ): Promise<RegistroDeProgreso> {
    return this.progreso.actualizar(idRegistro, input, solicitante);
  }

  eliminarProgreso(idRegistro: number, solicitante: Solicitante): Promise<void> {
    return this.progreso.eliminar(idRegistro, solicitante);
  }

  obtenerMiRutina(solicitante: Solicitante): Promise<Rutina | null> {
    return this.rutinas.obtenerVigentePropia(solicitante);
  }

  listarMiRutinas(solicitante: Solicitante): Promise<Rutina[]> {
    return this.rutinas.listarPropia(solicitante);
  }

  listarMiProgreso(solicitante: Solicitante): Promise<RegistroDeProgreso[]> {
    return this.progreso.listarPropio(solicitante);
  }
}
