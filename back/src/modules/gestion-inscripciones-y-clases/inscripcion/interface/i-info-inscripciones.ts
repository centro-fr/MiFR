import type { FiltroAlumnosPorInscripcion, ResumenInscripcionAlumno } from "../inscripcion.types.js";

// Interfaz provista por Inscripcion (vista arquitectónica) para que otros subsistemas consulten
// alumnos inscriptos, su resumen vigente y la ocupación de horarios sin conocer su persistencia.
export interface IInfoInscripciones {
  obtenerIdsDeAlumnos(filtro: FiltroAlumnosPorInscripcion): Promise<number[]>;
  resumirInscripcionesVigentes(idsAlumnos: number[]): Promise<ResumenInscripcionAlumno[]>;
  contarInscriptosVigentesEnHorario(idHorario: number): Promise<number>;
  tieneInscriptosVigentesDeActividad(idActividad: number): Promise<boolean>;
}
