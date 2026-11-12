import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";
import type { AuthUser, RoleCode } from "@/types/auth";

vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));

const RUTA_PROTEGIDA = "/app/seguridad/permisos";

function PantallaLogin() {
  const { state } = useLocation();
  return <p>Login desde {(state as { from?: string } | null)?.from}</p>;
}

interface Escenario {
  user: AuthUser | null;
  isLoading?: boolean;
  roles?: RoleCode[];
  permission?: string;
}

function renderizarGuard({ user, isLoading = false, roles, permission }: Escenario) {
  vi.mocked(useAuth).mockReturnValue(crearSesion(user, isLoading));
  render(
    <MemoryRouter initialEntries={[RUTA_PROTEGIDA]}>
      <Routes>
        <Route
          path={RUTA_PROTEGIDA}
          element={
            <PermissionGuard roles={roles} permission={permission}>
              Contenido protegido
            </PermissionGuard>
          }
        />
        <Route path="/login" element={<PantallaLogin />} />
      </Routes>
    </MemoryRouter>,
  );
}

function esperarAccesoDenegado() {
  expect(screen.getByRole("heading", { name: "Sin acceso" })).toBeInTheDocument();
  expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
}

describe("PermissionGuard", () => {
  // Evita mostrar 'Sin acceso' por un instante mientras se restaura la sesión.
  it("muestra el splash mientras se restaura la sesión", () => {
    renderizarGuard({ user: null, isLoading: true });

    expect(screen.getByRole("status", { name: "Cargando sesión" })).toBeInTheDocument();
  });

  // US-01: sin sesión se va al login y después se vuelve a la ruta pedida.
  it("redirige al login sin sesión y recuerda la ruta de origen", () => {
    renderizarGuard({ user: null });

    expect(screen.getByText(`Login desde ${RUTA_PROTEGIDA}`)).toBeInTheDocument();
  });

  // Sin restricciones alcanza con estar autenticado.
  it("muestra el contenido si no exige roles ni permisos", () => {
    renderizarGuard({ user: crearUsuario(["ALUMNO"]) });

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  // Solo la propietaria entra a la matriz de permisos.
  it("deja pasar a la propietaria con el permiso de la matriz", () => {
    renderizarGuard({
      user: crearUsuario(["PROPIETARIA"], ["SEGURIDAD_MATRIZ_VER"]),
      roles: ["PROPIETARIA"],
      permission: "SEGURIDAD_MATRIZ_VER",
    });

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  // CA-05: 403 con botón de regreso al inicio de su rol.
  it("niega la matriz de permisos a una profesora y ofrece volver a su inicio", () => {
    renderizarGuard({
      user: crearUsuario(["PROFESORA"]),
      roles: ["PROPIETARIA"],
      permission: "SEGURIDAD_MATRIZ_VER",
    });

    esperarAccesoDenegado();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/app/inicio");
  });

  // Rol y permiso se exigen juntos: si la matriz quita el permiso, se pierde el acceso.
  it("niega el acceso si tiene el rol pero le falta el permiso", () => {
    renderizarGuard({
      user: crearUsuario(["PROPIETARIA"]),
      roles: ["PROPIETARIA"],
      permission: "SEGURIDAD_MATRIZ_VER",
    });

    esperarAccesoDenegado();
  });

  // Rol y permiso se exigen juntos: el permiso solo no alcanza.
  it("niega el acceso si tiene el permiso pero no el rol", () => {
    renderizarGuard({
      user: crearUsuario(["PROFESORA"], ["SEGURIDAD_MATRIZ_VER"]),
      roles: ["PROPIETARIA"],
      permission: "SEGURIDAD_MATRIZ_VER",
    });

    esperarAccesoDenegado();
  });

  // CA: un alumno no accede a la administración de planes ni de alumnos.
  it.each(["PLANES_EDITAR", "ALUMNOS_EDITAR"])("niega a un alumno la administración protegida por %s", (permiso) => {
    renderizarGuard({ user: crearUsuario(["ALUMNO"], ["RUTINAS_VER"]), permission: permiso });

    esperarAccesoDenegado();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/app/inicio");
  });

  // CA-06: Propietaria + Profesora accede a las funciones de propietaria.
  it("deja pasar a un usuario multi-rol si alguno de sus roles está permitido", () => {
    renderizarGuard({
      user: crearUsuario(["PROFESORA", "PROPIETARIA"], ["SEGURIDAD_MATRIZ_VER"]),
      roles: ["PROPIETARIA"],
      permission: "SEGURIDAD_MATRIZ_VER",
    });

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });
});
