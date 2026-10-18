import type { ClaseConDatos } from "../../clase/clase.types.js";
import type {
  EstadoSeguimientoInactividad,
  MarcaDeSeguimiento,
  RachaDeInasistencia,
  SeguimientoInactividad,
} from "../asistencia.types.js";

// Interfaz provista por Asistencia en la vista arquitectónica. La usan CierreAsistencia, para completar
// los ausentes (US-21), y DetectorInactividad (Reportes, US-22), para las rachas de inasistencia y la
// marca de gestión de cada inscripción, que se guarda acá porque Reportes no tiene tablas.
export interface IInfoAsistencia {
  tieneMarcasManuales(idClase: number): Promise<boolean>;
  // Registra ausentes a los inscriptos vigentes sin marcar; no toca a los ya marcados. Devuelve
  // cuántos ausentes agregó.
  completarAusentes(clase: ClaseConDatos, fechaRegistro: Date): Promise<number>;
  // De una sola consulta. Solo cuentan las clases cerradas (DICTADA): una abierta todavía puede cambiar.
  // Una inscripción sin marcas en clases cerradas no figura.
  rachasDeInasistencia(idsInscripciones: number[]): Promise<Map<number, RachaDeInasistencia>>;
  // La marca de cada inscripción que sigue valiendo: deja de valer si el alumno asistió después de que
  // se registró, y la racha nueva vuelve a estar pendiente.
  seguimientosVigentes(idsInscripciones: number[]): Promise<Map<number, MarcaDeSeguimiento>>;
  // Una marca por inscripción: volver a marcar la pisa.
  registrarSeguimiento(
    idInscripcion: number,
    estado: EstadoSeguimientoInactividad,
    idUsuario: number,
  ): Promise<SeguimientoInactividad>;
  // false si la inscripción no tenía marca.
  quitarSeguimiento(idInscripcion: number): Promise<boolean>;
}
