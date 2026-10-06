export type RoleCode = "PROPIETARIA" | "PROFESORA" | "ALUMNO" | "TUTOR";

export interface AuthUser {
  id_usuario: number;
  email: string;
  nombre: string;
  apellido: string;
  roles: RoleCode[];
  permisos: string[];
}

export interface AuthResponse {
  token: string;
  usuario: AuthUser;
}

export type AuthErrorCode =
  | "ACCESO_NO_HABILITADO"
  | "USUARIO_INACTIVO"
  | "INVALID_GOOGLE_TOKEN"
  | "RED_ERROR"
  | "POPUP_BLOQUEADO"
  | "POPUP_CANCELADO";

export interface ApiError {
  codigo: string;
  mensaje: string;
}

export function homePathForRoles(roles: RoleCode[]): string {
  if (roles.includes("PROPIETARIA")) return "/app/dashboard";
  if (roles.includes("PROFESORA")) return "/app/hoy";
  return "/app/inicio";
}
