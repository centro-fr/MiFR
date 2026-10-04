export interface Usuario {
  id_usuario?: number;
  nombre: string;
  apellido: string;
  email: string;
  estado?: string;
  dni?: string | null;
  telefono?: string | null;
}

export interface SesionActiva {
  token: string;
  usuario: Usuario;
  roles: string[];
  permisos: string[];
}

export interface PerfilUsuario {
  usuario: Usuario;
  roles: string[];
  permisos: string[];
}
