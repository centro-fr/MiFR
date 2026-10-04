import type { Usuario } from "../types/usuario";

export interface UsuarioConRolesCompleto extends Usuario {
  id_usuario: number;
  roles: {
    id_rol: number;
    rol: {
      id_rol: number;
      codigo: string;
      nombre: string;
    };
  }[];
}

export async function listarUsuarios(token: string): Promise<UsuarioConRolesCompleto[]> {
  const res = await fetch("/api/v1/usuarios", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al listar usuarios");
  return data as UsuarioConRolesCompleto[];
}
