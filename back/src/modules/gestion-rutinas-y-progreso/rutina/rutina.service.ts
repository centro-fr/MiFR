import { ForbiddenError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import {
  AccesoAAlumno,
  ocultarObservaciones,
  type AlumnoLookup,
  type ProfesoraLookup,
} from "../acceso-a-alumno.js";
import type { ActualizarRutinaInput, CrearRutinaInput } from "./rutina.schemas.js";
import type { RutinaRepository } from "./rutina.repository.js";
import type { Rutina } from "./rutina.types.js";

// ck_rutinas_fechas sobre las fechas que quedan después de editar: si el pedido trae una sola, la
// otra es la guardada. Sin esto, la base rechaza el cambio con un error 500.
function verificarFechas(rutina: Rutina, cambios: ActualizarRutinaInput): void {
  const desde = cambios.fecha_desde ?? rutina.fecha_desde;
  const hasta = cambios.fecha_hasta === undefined ? rutina.fecha_hasta : cambios.fecha_hasta;
  if (hasta !== null && hasta < desde) {
    throw new ValidationError("La fecha de fin no puede ser anterior a la de inicio");
  }
}

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

    const existentes = await this.repositorio.listarDeAlumno(input.id_alumno);
    const nombreNormalizado = input.nombre.trim().toLowerCase();
    if (existentes.some((r) => r.nombre.trim().toLowerCase() === nombreNormalizado)) {
      throw new ValidationError(`Ya existe una rutina con el nombre "${input.nombre.trim()}" para este alumno`);
    }

    const { id_profesora: _omitida, ...datos } = input;
    return this.repositorio.crear({ ...datos, id_profesora: idProfesora });
  }

  async actualizar(idRutina: number, input: ActualizarRutinaInput, solicitante: Solicitante): Promise<Rutina> {
    const rutina = await this.repositorio.buscarPorId(idRutina);
    if (!rutina) {
      if (solicitante.esPropietaria) throw new NotFoundError("Rutina no encontrada");
      throw new ForbiddenError("Solo podés modificar rutinas de los alumnos que tenés a cargo");
    }
    await this.acceso.verificarGestion(rutina.id_alumno, solicitante);
    verificarFechas(rutina, input);

    if (input.nombre) {
      const existentes = await this.repositorio.listarDeAlumno(rutina.id_alumno);
      const nombreNormalizado = input.nombre.trim().toLowerCase();
      if (existentes.some((r) => r.id_rutina !== idRutina && r.nombre.trim().toLowerCase() === nombreNormalizado)) {
        throw new ValidationError(`Ya existe una rutina con el nombre "${input.nombre.trim()}" para este alumno`);
      }
    }

    return this.repositorio.actualizar(idRutina, input);
  }

  async eliminar(idRutina: number, solicitante: Solicitante): Promise<void> {
    const rutina = await this.repositorio.buscarPorId(idRutina);
    if (!rutina) {
      if (solicitante.esPropietaria) throw new NotFoundError("Rutina no encontrada");
      throw new ForbiddenError("Solo podés eliminar rutinas de los alumnos que tenés a cargo");
    }
    await this.acceso.verificarGestion(rutina.id_alumno, solicitante);
    await this.repositorio.eliminar(idRutina);
  }

  // El historial lo ve quien gestiona al alumno; el alumno y su tutor también, sin las observaciones (US-28).
  async listarDeAlumno(idAlumno: number, solicitante: Solicitante): Promise<Rutina[]> {
    const alcance = await this.acceso.verificarLectura(idAlumno, solicitante);
    const rutinas = await this.repositorio.listarDeAlumno(idAlumno);
    return alcance === "GESTION" ? rutinas : rutinas.map(ocultarObservaciones);
  }

  // null: el alumno todavía no tiene rutina (estado vacío del portal).
  async obtenerVigente(idAlumno: number, solicitante: Solicitante): Promise<Rutina | null> {
    const alcance = await this.acceso.verificarLectura(idAlumno, solicitante);
    const vigente = await this.repositorio.buscarVigenteDeAlumno(idAlumno);
    return vigente && alcance === "PROPIA" ? ocultarObservaciones(vigente) : vigente;
  }

  async obtenerVigentePropia(solicitante: Solicitante): Promise<Rutina | null> {
    const idAlumno = await this.acceso.resolverAlumnoPropio(solicitante);
    return this.obtenerVigente(idAlumno, solicitante);
  }

  async listarPropia(solicitante: Solicitante): Promise<Rutina[]> {
    const idAlumno = await this.acceso.resolverAlumnoPropio(solicitante);
    return this.listarDeAlumno(idAlumno, solicitante);
  }
}
