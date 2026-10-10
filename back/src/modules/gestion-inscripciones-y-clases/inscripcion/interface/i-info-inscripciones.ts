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
  // Las PREINSCRIPTA o ACTIVA del alumno, con plan, precio, profesora y horarios: la ficha de US-10.
  listarVigentesDeAlumno(idAlumno: number): Promise<InscripcionConDatos[]>;
  obtenerIdsDeAlumnos(filtro: FiltroAlumnosPorInscripcion): Promise<number[]>;
  resumirInscripcionesVigentes(idsAlumnos: number[]): Promise<ResumenInscripcionAlumno[]>;
  // Inscriptos vigentes por horario, de una sola consulta; un horario sin inscriptos no figura.
  contarInscriptosVigentes(idsHorarios: number[]): Promise<Map<number, number>>;
}
