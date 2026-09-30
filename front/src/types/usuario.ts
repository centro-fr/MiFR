export interface Usuario {
  nombre: string;
  apellido: string;
  email: string;
}

export interface SesionActiva {
  token: string;
  usuario: Usuario;
  roles: string[];
}
