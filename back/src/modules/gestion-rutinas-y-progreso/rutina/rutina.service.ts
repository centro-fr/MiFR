import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import { AccesoAAlumno, type AlumnoLookup, type ProfesoraLookup } from "../acceso-a-alumno.js";
import type { CrearRutinaInput } from "./rutina.schemas.js";
import type { RutinaRepository } from "./rutina.repository.js";
import type { Rutina } from "./rutina.types.js";

// Componente Rutina de GestionRutinasYProgreso (US-27 y US-28). Quién puede cargar y quién puede ver
// a cada alumno lo decide AccesoAAlumno, la misma regla que usa Progreso.
export class RutinaService {
  private readonly acceso: AccesoAAlumno;

  constructor(
    private readonly repositorio: RutinaRepository,
    alumnos: AlumnoLookup,
    profesoras: ProfesoraLookup,
  ) {
    this.acceso = new AccesoAAlumno(repositorio, alumnos, profesoras);
  }

  async crear(input: CrearRutinaInput, solicitante: Solicitante): Promise<Rutina> {
    const idProfesora = await this.acceso.autorizarEscritura(
      input.id_alumno,
      input.id_profesora,
      solicitante,
    );
    const { id_profesora: _omitida, ...datos } = input;
    return this.repositorio.crear({ ...datos, id_profesora: idProfesora });
  }

  // El historial lo ve quien gestiona al alumno; el alumno y su tutor también (US-28).
  async listarDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<Rutina[]> {
    await this.acceso.verificarLectura(idAlumno, solicitante);
    return this.repositorio.listarDeAlumno(idAlumno);
  }

  // null: el alumno todavía no tiene rutina (estado vacío del portal).
  async obtenerVigente(idAlumno: number, solicitante: Solicitante): Promise<Rutina | null> {
    await this.acceso.verificarLectura(idAlumno, solicitante);
    return this.repositorio.buscarVigenteDeAlumno(idAlumno);
  }
}
