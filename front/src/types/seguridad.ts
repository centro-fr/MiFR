export type CodigoRol = "PROPIETARIA" | "PROFESORA" | "ALUMNO" | "TUTOR";

export interface RolInfo {
  id_rol: number;
  codigo: CodigoRol;
  nombre: string;
}

export interface PermisoInfo {
  id_permiso: number;
  codigo: string;
  descripcion: string | null;
  critico: boolean;
}

export interface ModuloPermisos {
  modulo: string;
  permisos: PermisoInfo[];
}

export interface MatrizPermisos {
  roles: RolInfo[];
  modulos: ModuloPermisos[];
  matriz: Record<string, string[]>;
}

export interface CambioPermiso {
  rol: CodigoRol;
  permiso: string;
  otorgado: boolean;
}

export interface ActualizarMatrizInput {
  cambios: CambioPermiso[];
}
