import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
  ReactivarAlumnoInput,
} from "../inscripcion/inscripcion.schemas.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { FiltroInscripciones, InscripcionConDatos } from "../inscripcion/inscripcion.types.js";
import type { EstadoHabilitacion } from "../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";
import type { InscriptoConAsistencia, MarcarAsistenciaInput } from "../asistencia/asistencia.types.js";
import type { ClaseConDatos } from "../clase/clase.types.js";

// La parte de ILogicaInscripcionesYClases que usa el controller de Inscripcion. No es una
// interfaz nueva del diagrama.
export interface ILogicaInscripciones {
  crearInscripcion(input: CrearInscripcionInput, solicitante: Solicitante): Promise<InscripcionConDatos>;
  listarInscripciones(filtro: FiltroInscripciones, solicitante: Solicitante): Promise<InscripcionConDatos[]>;
  obtenerInscripcion(id: number, solicitante: Solicitante): Promise<InscripcionConDatos>;
  darDeBajaAlumno(idAlumno: number, input: DarDeBajaAlumnoInput): Promise<void>;
  reactivarAlumno(idAlumno: number, input: ReactivarAlumnoInput): Promise<InscripcionConDatos>;
  cambiarPlan(id: number, input: CambiarPlanInput): Promise<InscripcionConDatos>;
  actualizarHorarios(id: number, input: ActualizarHorariosInput): Promise<InscripcionConDatos>;
}

// Clase del día con lo que muestra la home de la profesora (US-20).
export interface ClaseDelDia extends ClaseConDatos {
  inscriptos: number;
  cupo_disponible: number | null;
}

// Misma forma que la situación de cuota de la ficha del alumno (US-10), para que el front la
// muestre con el mismo badge.
export interface SituacionCuotaEnClase {
  estado: EstadoHabilitacion;
  fecha_vencimiento: Date | null;
  dias_restantes: number | null;
  puede_asistir: boolean;
  tiene_pago_pendiente: boolean;
}

export interface InscriptoEnLista extends InscriptoConAsistencia {
  situacion_cuota: SituacionCuotaEnClase | null;
}

export interface AsistenciaDeClase {
  clase: ClaseConDatos;
  inscriptos: InscriptoEnLista[];
}

// La parte que usa el router de /clases: la resuelven Clase, Asistencia y CierreAsistencia, y el
// subsistema le suma el estado de cuota de cada inscripto (IInfoCuotas).
export interface ILogicaClasesYAsistencia {
  listarClasesDeHoy(solicitante: Solicitante): Promise<ClaseDelDia[]>;
  listarClasesDeFecha(fecha: Date, solicitante: Solicitante): Promise<ClaseDelDia[]>;
  obtenerAsistenciaDeClase(idClase: number, solicitante: Solicitante): Promise<AsistenciaDeClase>;
  marcarAsistencia(
    idClase: number,
    idAlumno: number,
    input: MarcarAsistenciaInput,
    solicitante: Solicitante,
  ): Promise<void>;
  marcarTodosPresentes(idClase: number, solicitante: Solicitante): Promise<void>;
  cerrarAsistencia(idClase: number, solicitante: Solicitante): Promise<ClaseConDatos>;
  cancelarClase(idClase: number, solicitante: Solicitante): Promise<ClaseConDatos>;
}

// Interfaz del subsistema GestionInscripcionesYClases en la vista arquitectónica: es lo único que
// ve la capa de presentación (InscripcionYClasesPresWeb).
export interface ILogicaInscripcionesYClases extends ILogicaInscripciones, ILogicaClasesYAsistencia {}
