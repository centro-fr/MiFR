import { ForbiddenError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { CrearRutinaInput } from "./rutina.schemas.js";
import type { RutinaRepository } from "./rutina.repository.js";
import type { Rutina } from "./rutina.types.js";

// Solo lo que el service necesita de los otros módulos.
export interface AlumnoLookup {
  buscarPorId(id: number): Promise<{ id_usuario: number; id_usuario_responsable: number | null } | null>;
}
export interface ProfesoraLookup {
  buscarPorId(id: number): Promise<{ id_profesora: number } | null>;
  buscarPorUsuario(idUsuario: number): Promise<{ id_profesora: number } | null>;
}

// Componente Rutina de GestionRutinasYProgreso (US-27 y US-28). Escribe la propietaria o la profesora
// que tiene al alumno a cargo; el alumno y el tutor de un menor solo leen lo propio. A quien no puede
// ver a un alumno, uno que no existe se le responde igual que uno ajeno (seguridad.md, 3).
export class RutinaService {
  constructor(
    private readonly repositorio: RutinaRepository,
    private readonly alumnos: AlumnoLookup,
    private readonly profesoras: ProfesoraLookup,
  ) {}

  async crear(input: CrearRutinaInput, solicitante: Solicitante): Promise<Rutina> {
    const alumno = await this.alumnos.buscarPorId(input.id_alumno);
    const propia = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    await this.verificarEscritura(input.id_alumno, alumno !== null, propia?.id_profesora ?? null, solicitante);
    if (!alumno) throw new NotFoundError("Alumno no encontrado");

    const idProfesora = await this.resolverProfesora(input.id_profesora, propia?.id_profesora ?? null, solicitante);
    const { id_profesora: _omitida, ...datos } = input;
    return this.repositorio.crear({ ...datos, id_profesora: idProfesora });
  }

  // El historial lo ve quien gestiona al alumno; el alumno y su tutor también (US-28).
  async listarDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<Rutina[]> {
    await this.verificarLectura(idAlumno, solicitante);
    return this.repositorio.listarDeAlumno(idAlumno);
  }

  // null: el alumno todavía no tiene rutina (estado vacío del portal).
  async obtenerVigente(idAlumno: number, solicitante: Solicitante): Promise<Rutina | null> {
    await this.verificarLectura(idAlumno, solicitante);
    return this.repositorio.buscarVigenteDeAlumno(idAlumno);
  }

  private async verificarLectura(idAlumno: number, solicitante: Solicitante): Promise<void> {
    if (solicitante.esPropietaria) return this.verificarQueExiste(idAlumno);
    const alumno = await this.alumnos.buscarPorId(idAlumno);
    if (alumno && (alumno.id_usuario === solicitante.idUsuario || alumno.id_usuario_responsable === solicitante.idUsuario)) {
      return;
    }
    const propia = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    if (alumno && propia && (await this.repositorio.profesoraTieneAlumno(propia.id_profesora, idAlumno))) return;
    throw new ForbiddenError("Solo podés ver tu rutina, la de un menor a tu cargo o la de tus alumnos");
  }

  private async verificarQueExiste(idAlumno: number): Promise<void> {
    if (!(await this.alumnos.buscarPorId(idAlumno))) throw new NotFoundError("Alumno no encontrado");
  }

  private async verificarEscritura(
    idAlumno: number,
    existe: boolean,
    idProfesoraPropia: number | null,
    solicitante: Solicitante,
  ): Promise<void> {
    if (solicitante.esPropietaria) return;
    if (existe && idProfesoraPropia !== null && (await this.repositorio.profesoraTieneAlumno(idProfesoraPropia, idAlumno))) {
      return;
    }
    throw new ForbiddenError("Solo podés cargar rutinas a los alumnos que tenés a cargo");
  }

  // La profesora carga a su nombre. La propietaria elige la profesora o, si ella también lo es, queda la suya.
  private async resolverProfesora(
    pedida: number | undefined,
    propia: number | null,
    solicitante: Solicitante,
  ): Promise<number> {
    if (!solicitante.esPropietaria) return propia as number;
    if (pedida !== undefined) {
      if (!(await this.profesoras.buscarPorId(pedida))) throw new ValidationError(`La profesora ${pedida} no existe`);
      return pedida;
    }
    if (propia !== null) return propia;
    throw new ValidationError("Indicá la profesora que carga la rutina");
  }
}