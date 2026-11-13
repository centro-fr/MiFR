import { vi } from "vitest";
import type { AuthContextValue } from "@/features/auth/hooks/auth-context";
import type { AuthUser, RoleCode } from "@/types/auth";

export function crearUsuario(roles: RoleCode[], permisos: string[] = []): AuthUser {
  return { id_usuario: 1, email: "ana@example.com", nombre: "Ana", apellido: "Pérez", roles, permisos };
}

export function crearSesion(user: AuthUser | null, isLoading = false): AuthContextValue {
  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login: vi.fn(),
    loginDesarrollo: vi.fn(),
    logout: vi.fn(),
  };
}
