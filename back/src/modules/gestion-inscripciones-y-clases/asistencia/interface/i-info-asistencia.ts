import type { ClaseConDatos } from "../../clase/clase.types.js";
import type { MarcaDeHistorial } from "../../../calculos-del-negocio/calculador-racha-ranking/calculador-racha-ranking.types.js";
import type {
  AsistenciaDeAlumno,
  AsistenciaDeProfesora,
  EstadoSeguimientoInactividad,
  FiltroAsistenciasDictadas,
  MarcaDeSeguimiento,
  RachaDeInasistencia,
  SeguimientoInactividad,
} from "../asistencia.types.js";

// Interfaz provista por Asistencia en la vista arquitectónica. La usan CierreAsistencia, para completar
// los ausentes (US-21); DetectorInactividad (Reportes, US-22), para las rachas de inasistencia y la
// marca de gestión de cada inscripción, que se guarda acá porque Reportes no tiene tablas; Insignia
// (GestionInsignias, US-30 y US-31), para el historial y el ranking, y GeneradorInformes (US-33).
export interface IInfoAsistencia {
  tieneMarcasManuales(idClase: number): Promise<boolean>;
  // Registra ausentes a los inscriptos vigentes sin marcar; no toca a los ya marcados. Devuelve
  // cuántos ausentes agregó.
  completarAusentes(clase: ClaseConDatos, fechaRegistro: Date): Promise<number>;
  // RN: Registra presentes a los inscriptos vigentes cuando una clase no tuvo ninguna asistencia marcada.
  completarPresentes(clase: ClaseConDatos, fechaRegistro: Date): Promise<number>;
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
  // Una fila por alumno con marcas que cumplen el filtro, de una sola consulta.
  resumirPorAlumno(filtro: FiltroAsistenciasDictadas): Promise<AsistenciaDeAlumno[]>;
  // Una fila por profesora que dictó alguna de esas clases, ordenadas por apellido y nombre.
  resumirPorProfesora(filtro: FiltroAsistenciasDictadas): Promise<AsistenciaDeProfesora[]>;
  // Todas las marcas de clases dictadas de cada alumno, en orden cronológico, de una sola consulta.
  // Un alumno sin marcas figura con la lista vacía.
  historialDeAlumnos(idsAlumnos: number[]): Promise<Map<number, MarcaDeHistorial[]>>;
}
