import type {
  FiltroAlumnosPorInscripcion,
  InscripcionConDatos,
  ResumenInscripcionAlumno,
} from "../inscripcion.types.js";

// Interfaz provista por Inscripcion (vista arquitectónica) para que otros subsistemas consulten
// alumnos inscriptos, su resumen vigente y la ocupación de horarios sin conocer su persistencia.
export interface IInfoInscripciones {
  // Alta definitiva (US-07): la dispara el cobro al confirmar el primer pago, nunca la API.
  // Es idempotente, porque un pago confirmado dos veces no puede duplicar el alta.
  activar(idInscripcion: number): Promise<InscripcionConDatos>;
  // Las PREINSCRIPTA o ACTIVA del alumno, con plan, precio, profesora y horarios: la ficha de US-10.
  listarVigentesDeAlumno(idAlumno: number): Promise<InscripcionConDatos[]>;
  obtenerIdsDeAlumnos(filtro: FiltroAlumnosPorInscripcion): Promise<number[]>;
  resumirInscripcionesVigentes(idsAlumnos: number[]): Promise<ResumenInscripcionAlumno[]>;
  contarInscriptosVigentesEnHorario(idHorario: number): Promise<number>;
  tieneInscriptosVigentesDeActividad(idActividad: number): Promise<boolean>;
}
