import type { profesoras } from "@prisma/client";

// Interfaz provista por Profesor para que otros subsistemas consulten profesoras activas.
export interface IInfoProfesores {
  buscarPorId(id: number): Promise<profesoras | null>;
  listar(): Promise<profesoras[]>;
}
