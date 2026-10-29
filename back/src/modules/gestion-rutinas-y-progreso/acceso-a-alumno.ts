import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/app-error.js";
import type { Solicitante } from "../../shared/utils/solicitante.types.js";

// Solo lo que se necesita de los otros módulos.
export interface AlumnoLookup {
  buscarPorId(id: number): Promise<{ id_usuario: number; id_usuario_responsable: number | null } | null>;
  buscarPorIdUsuario(idUsuario: number): Promise<{ id_alumno: number } | null>;
  buscarPorIdUsuarioResponsable(idUsuario: number): Promise<{ id_alumno: number } | null>;
}
export interface ProfesoraLookup {
  buscarPorId(id: number): Promise<{ id_profesora: number } | null>;
  buscarPorUsuario(idUsuario: number): Promise<{ id_profesora: number } | null>;
}
export interface AlumnosACargo {
  profesoraTieneAlumno(idProfesora: number, idAlumno: number): Promise<boolean>;
}

// GESTION: la propietaria o la profesora a cargo. PROPIA: el alumno o el tutor de un menor.
export type AlcanceDeLectura = "GESTION" | "PROPIA";

// US-28: las observaciones son notas de la profesora para quien gestiona al alumno; el alumno y el tutor no
// las ven. Se mandan en null para que la respuesta tenga la misma forma para todos.
export function ocultarObservaciones<T extends { observaciones: string | null }>(dato: T): T {
  return { ...dato, observaciones: null };
}

// Quién puede ver y quién puede cargar datos de un alumno en GestionRutinasYProgreso (US-27 y US-28):
// la propietaria a todos, la profesora a los que tiene a cargo, y el alumno y el tutor de un menor solo
// leen lo propio. A quien no puede ver a un alumno, uno que no existe se le responde igual que uno
// ajeno (seguridad.md, 3). Lo usan Rutina y Progreso para aplicar la misma regla.
export class AccesoAAlumno {
  constructor(
    private readonly aCargo: AlumnosACargo,
    private readonly alumnos: AlumnoLookup,
    private readonly profesoras: ProfesoraLookup,
  ) {}

  // El alumno de quien pide o, si es tutor, uno de sus menores a cargo. Con varios menores no puede elegir:
  // para eso el front usa GET /alumnos/mios y las consultas por id_alumno.
  async resolverAlumnoPropio(solicitante: Solicitante): Promise<number> {
    const alumno =
      (await this.alumnos.buscarPorIdUsuario(solicitante.idUsuario)) ??
      (await this.alumnos.buscarPorIdUsuarioResponsable(solicitante.idUsuario));
    if (!alumno) throw new NotFoundError("No se encontró un alumno asociado a este usuario");
    return alumno.id_alumno;
  }

  // La profesora a cargo se resuelve antes que el alumno y el tutor: si también es tutora de su alumno, ve
  // las observaciones como profesora.
  async verificarLectura(idAlumno: number, solicitante: Solicitante): Promise<AlcanceDeLectura> {
    const alumno = await this.alumnos.buscarPorId(idAlumno);
    if (solicitante.esPropietaria) {
      if (!alumno) throw new NotFoundError("Alumno no encontrado");
      return "GESTION";
    }
    const sinAcceso = new ForbiddenError(
      "Solo podés ver lo tuyo, lo de un menor a tu cargo o lo de tus alumnos",
    );
    if (!alumno) throw sinAcceso;
    const propia = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    if (propia && (await this.aCargo.profesoraTieneAlumno(propia.id_profesora, idAlumno))) return "GESTION";
    if (
      alumno.id_usuario === solicitante.idUsuario ||
      alumno.id_usuario_responsable === solicitante.idUsuario
    ) {
      return "PROPIA";
    }
    throw sinAcceso;
  }

  // Quién puede corregir o dar de baja lo ya cargado de un alumno: la propietaria y la profesora que lo tiene a
  // cargo. No elige profesora: lo cargado conserva la que lo cargó. El alumno ya existe, porque lo cargado lo
  // referencia.
  async verificarGestion(idAlumno: number, solicitante: Solicitante): Promise<void> {
    if (solicitante.esPropietaria) return;
    const propia = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    if (propia && (await this.aCargo.profesoraTieneAlumno(propia.id_profesora, idAlumno))) return;
    throw new ForbiddenError("Solo podés modificar datos de los alumnos que tenés a cargo");
  }

  // Devuelve la profesora a cuyo nombre queda lo que se carga. La profesora carga siempre a su nombre;
  // la propietaria elige una o, si ella también lo es, queda la suya.
  async autorizarEscritura(
    idAlumno: number,
    idProfesoraPedida: number | undefined,
    solicitante: Solicitante,
  ): Promise<number> {
    const alumno = await this.alumnos.buscarPorId(idAlumno);
    const propia = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    const idPropia = propia?.id_profesora ?? null;

    if (!solicitante.esPropietaria) {
      if (
        alumno === null ||
        idPropia === null ||
        !(await this.aCargo.profesoraTieneAlumno(idPropia, idAlumno))
      ) {
        throw new ForbiddenError("Solo podés cargar datos a los alumnos que tenés a cargo");
      }
      return idPropia;
    }

    if (!alumno) throw new NotFoundError("Alumno no encontrado");
    if (idProfesoraPedida !== undefined) {
      if (!(await this.profesoras.buscarPorId(idProfesoraPedida))) {
        throw new ValidationError(`La profesora ${idProfesoraPedida} no existe`);
      }
      return idProfesoraPedida;
    }
    if (idPropia !== null) return idPropia;
    throw new ValidationError("Indicá la profesora que carga el dato");
  }
}
