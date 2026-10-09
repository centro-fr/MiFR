import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
  ReactivarAlumnoInput,
} from "./inscripcion/inscripcion.schemas.js";
import type { Solicitante } from "../../shared/utils/solicitante.js";
import type { InscripcionService } from "./inscripcion/inscripcion.service.js";
import type { ILogicaInscripcionesYClases } from "./interface/i-logica-inscripciones-y-clases.js";
import type { FiltroInscripciones, InscripcionConDatos } from "./inscripcion/inscripcion.types.js";

export class GestionInscripcionesYClasesService implements ILogicaInscripcionesYClases {
  constructor(private readonly inscripciones: InscripcionService) {}

  crearInscripcion(input: CrearInscripcionInput): Promise<InscripcionConDatos> {
    return this.inscripciones.crear(input);
  }

  listarInscripciones(filtro: FiltroInscripciones, solicitante: Solicitante): Promise<InscripcionConDatos[]> {
    return this.inscripciones.listar(filtro, solicitante);
  }

  obtenerInscripcion(id: number, solicitante: Solicitante): Promise<InscripcionConDatos> {
    return this.inscripciones.obtenerPara(id, solicitante);
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
}
