import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
  ReactivarAlumnoInput,
} from "./inscripcion/inscripcion.schemas.js";
import type { InscripcionService } from "./inscripcion/inscripcion.service.js";
import type { ILogicaInscripcionesYClases } from "./interface/i-logica-inscripciones-y-clases.js";
import type {
  FiltroAlumnosPorInscripcion,
  FiltroInscripciones,
  InscripcionConDatos,
  ResumenInscripcionAlumno,
} from "./inscripcion/inscripcion.types.js";

export class GestionInscripcionesYClasesService implements ILogicaInscripcionesYClases {
  constructor(private readonly inscripciones: InscripcionService) {}

  crearInscripcion(input: CrearInscripcionInput): Promise<InscripcionConDatos> {
    return this.inscripciones.crear(input);
  }

  listarInscripciones(filtro: FiltroInscripciones): Promise<InscripcionConDatos[]> {
    return this.inscripciones.listar(filtro);
  }

  obtenerInscripcion(id: number): Promise<InscripcionConDatos> {
    return this.inscripciones.obtenerPorId(id);
  }

  activarInscripcion(id: number): Promise<InscripcionConDatos> {
    return this.inscripciones.activar(id);
  }

  darDeBajaAlumno(idAlumno: number, input: DarDeBajaAlumnoInput): Promise<void> {
    return this.inscripciones.darDeBajaAlumno(idAlumno, input);
  }

  reactivarAlumno(idAlumno: number, input: ReactivarAlumnoInput): Promise<InscripcionConDatos> {
    return this.inscripciones.reactivarAlumno(idAlumno, input);
  }

  cambiarPlan(id: number, input: CambiarPlanInput): Promise<InscripcionConDatos> {
    return this.inscripciones.cambiarPlan(id, input);
  }

  actualizarHorarios(id: number, input: ActualizarHorariosInput): Promise<InscripcionConDatos> {
    return this.inscripciones.actualizarHorarios(id, input);
  }

  obtenerIdsDeAlumnos(filtro: FiltroAlumnosPorInscripcion): Promise<number[]> {
    return this.inscripciones.obtenerIdsDeAlumnos(filtro);
  }

  resumirInscripcionesVigentes(idsAlumnos: number[]): Promise<ResumenInscripcionAlumno[]> {
    return this.inscripciones.resumirInscripcionesVigentes(idsAlumnos);
  }

  contarInscriptosVigentesEnHorario(idHorario: number): Promise<number> {
    return this.inscripciones.contarInscriptosVigentesEnHorario(idHorario);
  }

  tieneInscriptosVigentesDeActividad(idActividad: number): Promise<boolean> {
    return this.inscripciones.tieneInscriptosVigentesDeActividad(idActividad);
  }
}
