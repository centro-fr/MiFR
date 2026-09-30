import type { permisos } from "@prisma/client";
import type { CodigoRol } from "../usuario/user.types.js";

export type Permiso = permisos;

// Fila de rol_permisos con los códigos, que es lo que la matriz necesita mostrar.
export interface AsignacionPermiso {
  rol: { codigo: CodigoRol };
  permiso: { codigo: string };
}

export interface ClavePermisoRol {
  id_rol: number;
  id_permiso: number;
}

export interface PermisoDeMatriz {
  id_permiso: number;
  codigo: string;
  descripcion: string | null;
  // No se guarda en la base: sale de la lista de críticos del catálogo.
  critico: boolean;
}

export interface MatrizPermisos {
  roles: { id_rol: number; codigo: CodigoRol; nombre: string }[];
  modulos: { modulo: string; permisos: PermisoDeMatriz[] }[];
  matriz: Record<string, string[]>;
}
