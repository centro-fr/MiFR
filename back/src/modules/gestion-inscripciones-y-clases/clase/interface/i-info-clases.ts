import type { ClaseConDatos } from "../clase.types.js";
import type { Solicitante } from "../../../../shared/utils/solicitante.types.js";

// Interfaz provista por Clase en la vista arquitectónica. Dentro del subsistema la usan Asistencia
// y CierreAsistencia para consultar una clase y moverla en su ciclo (estados_clase.puml).
export interface IInfoClases {
  // La clase, si quien pide puede tomarle asistencia: la propietaria, cualquiera; la profesora,
  // solo las que dicta hoy. Para el resto responde 404, igual que si no existiera.
  obtenerPara(idClase: number, solicitante: Solicitante): Promise<ClaseConDatos>;
  // Toma el bloqueo de la clase en la transacción en curso y comprueba que admite marcas.
  bloquearParaMarcar(idClase: number, solicitante: Solicitante): Promise<void>;
  listarAbiertasHasta(fecha: Date): Promise<ClaseConDatos[]>;
  // PROGRAMADA → DICTADA. Devuelve null si la clase ya no estaba PROGRAMADA.
  cerrar(idClase: number, fechaCierre: Date): Promise<ClaseConDatos | null>;
}
