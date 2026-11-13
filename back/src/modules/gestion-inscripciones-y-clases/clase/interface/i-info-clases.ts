import type { ClaseConDatos, ClaseSuplida } from "../clase.types.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.types.js";

// Interfaz provista por Clase en la vista arquitectónica. Dentro del subsistema la usan Asistencia,
// CierreAsistencia y Suplencia para consultar una clase y moverla en su ciclo (estados_clase.puml);
// afuera, Liquidacion (US-23) para las clases suplidas.
export interface IInfoClases {
  // La clase, si quien pide puede tomarle asistencia: la propietaria, cualquiera; la profesora,
  // solo las que dicta hoy. Para el resto responde 404, igual que si no existiera.
  obtenerPara(idClase: number, solicitante: Solicitante): Promise<ClaseConDatos>;
  // Toma el bloqueo de la clase en la transacción en curso y comprueba que admite marcas.
  bloquearParaMarcar(idClase: number, solicitante: Solicitante): Promise<void>;
  listarAbiertasHasta(fecha: Date): Promise<ClaseConDatos[]>;
  // PROGRAMADA → DICTADA. Devuelve null si la clase ya no estaba PROGRAMADA.
  cerrar(idClase: number, fechaCierre: Date): Promise<ClaseConDatos | null>;
  // La clase de un horario en una fecha, creándola si todavía no existe (US-24). Valida que la fecha
  // sea del día de la semana del horario y que el horario estuviera vigente.
  materializar(idHorario: number, fecha: Date): Promise<ClaseConDatos>;
  // Toma el bloqueo de la clase en la transacción en curso: dos cambios de suplencia no se cruzan.
  bloquearParaSuplencia(idClase: number): Promise<ClaseConDatos>;
  cambiarDictante(idClase: number, idProfesora: number): Promise<void>;
  // Las clases suplidas entre dos fechas, incluidas, sin las canceladas.
  listarSuplidasEnPeriodo(desde: Date, hasta: Date): Promise<ClaseSuplida[]>;
}
