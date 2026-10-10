import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";
import type { AuthUser } from "@/types/auth";

vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));

function renderizarCon(user: AuthUser | null) {
  vi.mocked(useAuth).mockReturnValue(crearSesion(user));
  return renderHook(() => usePermissions()).result.current;
}

describe("usePermissions", () => {
  // Sin usuario logueado no se muestra ningún menú ni botón protegido.
  it("sin sesión no tiene roles ni permisos", () => {
    const permisos = renderizarCon(null);

    expect(permisos.roles).toEqual([]);
    expect(permisos.permisos).toEqual([]);
    expect(permisos.hasPermission("PLANES_VER")).toBe(false);
    expect(permisos.hasRole("PROPIETARIA")).toBe(false);
    expect(permisos.hasAnyRole(["PROPIETARIA", "ALUMNO"])).toBe(false);
  });

  // Base de <Can>: decide por permiso efectivo, no por rol.
  it("responde según los permisos efectivos del usuario", () => {
    const permisos = renderizarCon(crearUsuario(["ALUMNO"], ["RUTINAS_VER"]));

    expect(permisos.hasPermission("RUTINAS_VER")).toBe(true);
    expect(permisos.hasPermission("PLANES_EDITAR")).toBe(false);
  });

  // Base de <PermissionGuard> cuando la ruta se restringe por rol.
  it("responde según los roles del usuario", () => {
    const permisos = renderizarCon(crearUsuario(["PROFESORA"]));

    expect(permisos.hasRole("PROFESORA")).toBe(true);
    expect(permisos.hasRole("PROPIETARIA")).toBe(false);
  });

  // Una ruta puede aceptar varios roles; alcanza con tener uno.
  it("hasAnyRole devuelve true si coincide alguno de los roles buscados", () => {
    const permisos = renderizarCon(crearUsuario(["PROFESORA"]));

    expect(permisos.hasAnyRole(["PROPIETARIA", "PROFESORA"])).toBe(true);
  });

  // Pedir 'ningún rol' no debe dar acceso por accidente.
  it("hasAnyRole con una lista vacía devuelve false", () => {
    const permisos = renderizarCon(crearUsuario(["PROPIETARIA"]));

    expect(permisos.hasAnyRole([])).toBe(false);
  });

  // CA-06: una persona con dos roles ve la unión de ambos conjuntos de funciones.
  it("un usuario Propietaria + Profesora tiene los roles y permisos de ambos", () => {
    const permisos = renderizarCon(
      crearUsuario(["PROPIETARIA", "PROFESORA"], ["HONORARIOS_LIQUIDAR", "ASISTENCIAS_MARCAR"]),
    );

    expect(permisos.hasRole("PROPIETARIA")).toBe(true);
    expect(permisos.hasRole("PROFESORA")).toBe(true);
    expect(permisos.hasPermission("HONORARIOS_LIQUIDAR")).toBe(true);
    expect(permisos.hasPermission("ASISTENCIAS_MARCAR")).toBe(true);
  });
});
