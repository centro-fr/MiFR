import type { UsuarioConRoles } from "../usuario.types.js";

// Interfaz provista por Usuario para que otros subsistemas consulten la identidad sin depender de su repositorio.
export interface IInfoUsuarios {
  obtenerPorId(id: number): Promise<UsuarioConRoles>;
}
