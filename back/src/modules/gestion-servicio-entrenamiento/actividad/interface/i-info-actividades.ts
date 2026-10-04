import type { Actividad } from "../actividad.types.js";

// Interfaz provista por Actividad para que Horario consulte existencia y estado sin acoplarse a su service.
export interface IInfoActividades {
  buscarPorId(id: number): Promise<Actividad | null>;
}
