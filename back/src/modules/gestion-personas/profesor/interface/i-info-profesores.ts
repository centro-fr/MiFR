import type { Profesora } from "../profesor.types.js";

// Interfaz provista por Profesor para que otros subsistemas consulten profesoras activas.
export interface IInfoProfesores {
  buscarPorId(id: number): Promise<Profesora | null>;
  listar(): Promise<Profesora[]>;
}
