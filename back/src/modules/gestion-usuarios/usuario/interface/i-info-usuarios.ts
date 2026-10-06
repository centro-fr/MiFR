import type { UsuarioConRoles } from "../usuario.types.js";

// Interfaz provista por Usuario (vista arquitectónica) para que Sesion y los otros subsistemas
// consulten la identidad sin depender de su repositorio.
export interface IInfoUsuarios {
  obtenerPorId(id: number): Promise<UsuarioConRoles>;
  buscarPorId(id: number): Promise<UsuarioConRoles | null>;
  identificarPorGoogle(googleId: string, email: string): Promise<UsuarioConRoles | null>;
  buscarPorEmail(email: string): Promise<UsuarioConRoles | null>;
}
