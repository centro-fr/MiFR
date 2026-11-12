import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { GuestOnlyRoute, ProtectedRoute } from "@/components/guards/protected-route";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";
import type { AuthUser } from "@/types/auth";

vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));

function renderizar(ruta: string, user: AuthUser | null, isLoading = false) {
  vi.mocked(useAuth).mockReturnValue(crearSesion(user, isLoading));
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<GuestOnlyRoute>Formulario de login</GuestOnlyRoute>} />
        <Route path="/app/dashboard" element={<ProtectedRoute>Panel de la propietaria</ProtectedRoute>} />
        <Route path="/app/inicio" element={<ProtectedRoute>Inicio</ProtectedRoute>} />
        <Route path="/app/actividades" element={<ProtectedRoute>Contenido protegido</ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

// US-01, criterio: "Intentar acceder a una ruta protegida sin sesión → redirige al login".
describe("ProtectedRoute", () => {
  it("sin sesión: redirige al login y no muestra el contenido", () => {
    renderizar("/app/actividades", null);
    expect(screen.getByText("Formulario de login")).toBeInTheDocument();
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("con sesión: muestra el contenido", () => {
    renderizar("/app/actividades", crearUsuario(["PROPIETARIA"]));
    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  it("mientras se restaura la sesión: no redirige ni muestra el contenido", () => {
    renderizar("/app/actividades", null, true);
    expect(screen.queryByText("Formulario de login")).not.toBeInTheDocument();
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });
});

// US-01, caso borde: "Usuario con sesión ya activa intenta volver al login → redirigir al dashboard correspondiente".
describe("GuestOnlyRoute", () => {
  it("sin sesión: muestra el login", () => {
    renderizar("/login", null);
    expect(screen.getByText("Formulario de login")).toBeInTheDocument();
  });

  it.each([
    [["PROPIETARIA"], "Panel de la propietaria"],
    [["PROFESORA"], "Inicio"],
    [["ALUMNO"], "Inicio"],
  ] as const)("con sesión %j: redirige a su pantalla de inicio", (roles, pantalla) => {
    renderizar("/login", crearUsuario([...roles]));
    expect(screen.getByText(pantalla)).toBeInTheDocument();
    expect(screen.queryByText("Formulario de login")).not.toBeInTheDocument();
  });

  it("mientras se restaura la sesión: no muestra el login ni redirige", () => {
    renderizar("/login", null, true);
    expect(screen.queryByText("Formulario de login")).not.toBeInTheDocument();
  });
});
