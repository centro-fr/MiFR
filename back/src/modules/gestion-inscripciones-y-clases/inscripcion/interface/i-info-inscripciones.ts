import type {
  FiltroAlumnosPorInscripcion,
  InscripcionACobrar,
  InscripcionConDatos,
  InscriptoDeHorario,
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
  // Las que cerró la última baja del alumno (US-08), sin las que cerró un cambio de plan: la ficha de
  // un alumno dado de baja muestra con ellas lo que debía al irse.
  listarDeLaUltimaBaja(idAlumno: number): Promise<InscripcionConDatos[]>;
  // Inscriptos de un horario el día de una clase (US-20, US-21): inscripción vigente, horario
  // vigente ese día y alumno no dado de baja. Toman el bloqueo del horario en la transacción en
  // curso, así una baja no se cruza con el marcado o el cierre.
  listarParaAsistencia(idHorario: number, fecha: Date): Promise<InscriptoDeHorario[]>;
  buscarParaAsistencia(idHorario: number, idAlumno: number, fecha: Date): Promise<InscriptoDeHorario | null>;
  obtenerIdsDeAlumnos(filtro: FiltroAlumnosPorInscripcion): Promise<number[]>;
  resumirInscripcionesVigentes(idsAlumnos: number[]): Promise<ResumenInscripcionAlumno[]>;
  // Inscriptos vigentes por horario, de una sola consulta; un horario sin inscriptos no figura. Cuenta
  // también las pre-inscripciones con la reserva vencida: siguen en el horario y no dejan darlo de baja.
  contarInscriptosVigentes(idsHorarios: number[]): Promise<Map<number, number>>;
  // Con la misma regla que listarParaAsistencia, de una sola consulta: la cantidad que muestra la
  // lista de clases del día.
  contarInscriptosParaAsistencia(idsHorarios: number[], fecha: Date): Promise<Map<number, number>>;
  // Lugares ocupados por horario con la regla del cupo: las activas y las pre-inscripciones con la
  // reserva vigente. Es la ocupación que se muestra.
  contarLugaresOcupados(idsHorarios: number[]): Promise<Map<number, number>>;
}
