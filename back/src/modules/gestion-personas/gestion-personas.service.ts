import { ConflictError } from "../../shared/errors/app-error.js";
import type { IInfoHorarios } from "../gestion-servicio-entrenamiento/horario/interface/i-info-horarios.js";
import type { AlumnoService } from "./alumno/alumno.service.js";
import type { ActualizarAlumnoInput, CrearAlumnoInput } from "./alumno/alumno.schemas.js";
import type { Alumno, FiltroAlumno, PaginaAlumnos } from "./alumno/alumno.types.js";
import type { ILogicaPersonas } from "./interface/i-logica-personas.js";
import type { ProfesorService } from "./profesor/profesor.service.js";
import type { CrearProfesoraInput } from "./profesor/profesor.schemas.js";
import type { Profesora } from "./profesor/profesor.types.js";

export class GestionPersonasService implements ILogicaPersonas {
  constructor(
    private readonly profesoras: ProfesorService,
    private readonly horarios: IInfoHorarios,
    private readonly alumnos: AlumnoService,
  ) {}

  crearProfesora(input: CrearProfesoraInput): Promise<Profesora> {
    return this.profesoras.crear(input);
  }

  listarProfesoras(): Promise<Profesora[]> {
    return this.profesoras.listar();
  }

  async darDeBajaProfesora(id: number): Promise<Profesora> {
    if (await this.horarios.tieneActivosDeProfesora(id)) {
      throw new ConflictError("Debe dar de baja los horarios activos antes que a la profesora");
    }
    return this.profesoras.darDeBaja(id);
  }

  crearAlumno(input: CrearAlumnoInput): Promise<Alumno> {
    return this.alumnos.crear(input);
  }

  listarAlumnos(filtro: FiltroAlumno): Promise<PaginaAlumnos> {
    return this.alumnos.listar(filtro);
  }

  obtenerAlumnoPorId(id: number): Promise<Alumno> {
    return this.alumnos.obtenerPorId(id);
  }

  actualizarAlumno(id: number, input: ActualizarAlumnoInput): Promise<Alumno> {
    return this.alumnos.actualizar(id, input);
  }
}
