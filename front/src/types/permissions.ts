import type { RoleCode } from "@/types/auth";

// Contrato real del back (módulo rol, rama usuario):
// GET /api/v1/seguridad/matriz → { roles, modulos, matriz }
// PUT /api/v1/seguridad/matriz ← { cambios: [{ rol, permiso, otorgado }] }
// Errores: { error: { code, message } }.

export interface RolMatriz {
  id_rol: number;
  codigo: RoleCode;
  nombre: string;
}

export interface PermisoMatriz {
  id_permiso: number;
  codigo: string;
  descripcion: string | null;
  /** No se puede quitar a la propietaria (el back responde 400). */
  critico: boolean;
}

export interface ModuloMatriz {
  modulo: string;
  permisos: PermisoMatriz[];
}

/** matriz[ROL] = códigos de permisos otorgados a ese rol. */
export interface MatrizPermisos {
  roles: RolMatriz[];
  modulos: ModuloMatriz[];
  matriz: Record<RoleCode, string[]>;
}

export interface CambioPermiso {
  rol: RoleCode;
  permiso: string;
  otorgado: boolean;
}

export type MatrizErrorCode =
  | "SIN_PERMISO"
  | "PERMISO_BLOQUEADO"
  | "RED_ERROR"
  | "VALIDACION_ERROR";
