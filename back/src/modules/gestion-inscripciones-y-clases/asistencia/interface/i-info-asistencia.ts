import type { ClaseConDatos } from "../../clase/clase.types.js";

// Interfaz provista por Asistencia en la vista arquitectónica. Por ahora la usa CierreAsistencia
// para completar los ausentes (US-21); los informes y las insignias sumarán sus consultas.
export interface IInfoAsistencia {
  tieneMarcasManuales(idClase: number): Promise<boolean>;
  // Registra ausentes a los inscriptos vigentes sin marcar; no toca a los ya marcados. Devuelve
  // cuántos ausentes agregó.
  completarAusentes(clase: ClaseConDatos, fechaRegistro: Date): Promise<number>;
}
