import type {
  FiltroAlumnosPorInscripcion,
  InscripcionACobrar,
  InscripcionConDatos,
  ResumenInscripcionAlumno,
} from "../inscripcion.types.js";

// Interfaz provista por Inscripcion (vista arquitectónica) para que otros subsistemas consulten
// alumnos inscriptos, su resumen vigente y la ocupación de horarios sin conocer su persistencia.
export interface IInfoInscripciones {
  // Alta definitiva (US-07): la dispara el cobro al confirmar el primer pago, nunca la API.
  // Con la inscripción ya activa no hace nada: un pago confirmado dos veces no duplica el alta.
  activar(idInscripcion: number): Promise<InscripcionConDatos>;
  // La inscripción con su alumno y su tutor, en cualquier estado: la usa el cobro.
  buscarParaCobro(idInscripcion: number): Promise<InscripcionACobrar | null>;
  // Las PREINSCRIPTA o ACTIVA del alumno, con plan, precio, profesora, horarios y reserva: la ficha de US-10.
  listarVigentesDeAlumno(idAlumno: number): Promise<InscripcionConDatos[]>;
  obtenerIdsDeAlumnos(filtro: FiltroAlumnosPorInscripcion): Promise<number[]>;
  resumirInscripcionesVigentes(idsAlumnos: number[]): Promise<ResumenInscripcionAlumno[]>;
  // Inscriptos vigentes por horario, de una sola consulta; un horario sin inscriptos no figura. Cuenta
  // también las pre-inscripciones con la reserva vencida: siguen en el horario y no dejan darlo de baja.
  contarInscriptosVigentes(idsHorarios: number[]): Promise<Map<number, number>>;
  // Lugares ocupados por horario con la regla del cupo: las activas y las pre-inscripciones con la
  // reserva vigente. Es la ocupación que se muestra.
  contarLugaresOcupados(idsHorarios: number[]): Promise<Map<number, number>>;
}
