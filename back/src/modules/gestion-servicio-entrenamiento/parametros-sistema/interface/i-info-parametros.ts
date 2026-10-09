import type { ClaveParametro, ValoresParametros } from "../parametros-sistema.types.js";

// Interfaz provista por ParametrosSistema (GestionServicioEntrenamiento) para que otros
// componentes lean la configuración del centro: VENCIDOS_PUEDEN_ASISTIR para la habilitación,
// MINUTOS_CIERRE_ASISTENCIA para el cierre de la asistencia. El tipo de lo que devuelve depende
// de la clave: obtener("VENCIDOS_PUEDEN_ASISTIR") es un boolean.
export interface IInfoParametros {
  obtener<C extends ClaveParametro>(clave: C): Promise<ValoresParametros[C]>;
}
