import { useAuth } from "@/features/auth/hooks/use-auth";
import type { RoleCode } from "@/types/auth";

// Sistema centralizado de permisos (US-02, Fase 5 del SDD).
// Lee los permisos efectivos del usuario logueado (unión multi-rol calculada
// en el back). Los menús y botones se ocultan con <Can>, las rutas con <PermissionGuard>.
export function usePermissions() {
  const { user } = useAuth();
  const permisos = user?.permisos ?? [];
  const roles = user?.roles ?? [];

  function hasPermission(codigo: string): boolean {
    return permisos.includes(codigo);
  }

  function hasRole(rol: RoleCode): boolean {
    return roles.includes(rol);
  }

  function hasAnyRole(buscados: RoleCode[]): boolean {
    return buscados.some((rol) => roles.includes(rol));
  }

  return { permisos, roles, hasPermission, hasRole, hasAnyRole };
}
