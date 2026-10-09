import type { Profesora } from "../profesor.types.js";

// Interfaz provista por Profesor para que otros subsistemas consulten profesoras activas.
export interface IInfoProfesores {
  buscarPorId(id: number): Promise<Profesora | null>;
  // La profesora activa de ese usuario: con ella se decide qué alumnos tiene a cargo (US-10).
  buscarPorUsuario(idUsuario: number): Promise<Profesora | null>;
  listar(): Promise<Profesora[]>;
}
