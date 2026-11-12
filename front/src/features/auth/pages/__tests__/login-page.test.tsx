import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { AuthContextValue } from "@/features/auth/hooks/auth-context";
import { LoginPage } from "@/features/auth/pages/login-page";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";
import type { RoleCode } from "@/types/auth";

// Estas pruebas cubren el selector de perfiles del login de desarrollo con autenticación mock.
vi.hoisted(() => {
  vi.stubEnv("VITE_USE_MOCKS", "true");
  vi.stubEnv("VITE_LOGIN_DESARROLLO", "true");
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
});
vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));

function errorHttp(status: number, code: string) {
  const e = new AxiosError("fallo");
  e.response = { status, data: { error: { code } } } as never;
  return e;
}

function renderLogin(login: AuthContextValue["login"]) {
  vi.mocked(useAuth).mockReturnValue({ ...crearSesion(null), login, loginDesarrollo: login });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app/dashboard" element={<p>Panel de la propietaria</p>} />
          <Route path="/app/inicio" element={<p>Inicio</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PERFIL_POR_ROL: Record<RoleCode, { etiqueta: string; email: string }> = {
  PROPIETARIA: { etiqueta: "Propietaria + Profesora", email: "marina.sosa@example.com" },
  PROFESORA: { etiqueta: "Profesora", email: "lucia.gomez@example.com" },
  ALUMNO: { etiqueta: "Alumno", email: "camila.perez@example.com" },
  TUTOR: { etiqueta: "Tutor", email: "mariana.lopez@example.com" },
};

async function seleccionarPerfil(rol: RoleCode) {
  const selector = await screen.findByLabelText("Rol");
  const opcion = await screen.findByRole("option", { name: PERFIL_POR_ROL[rol].etiqueta });
  fireEvent.change(selector, { target: { value: opcion.getAttribute("value") ?? "" } });
}

// US-01: selector de perfil mock y estados del flujo de autenticación de desarrollo.
describe("LoginPage (US-01)", () => {
  it("con mocks muestra el selector de perfiles y ningún mensaje de error", async () => {
    renderLogin(vi.fn());
    expect(await screen.findByLabelText("Rol")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["PROPIETARIA", "Panel de la propietaria"],
    ["PROFESORA", "Inicio"],
    ["ALUMNO", "Inicio"],
  ] as [RoleCode, string][])("al elegir el perfil %s ingresa a su pantalla de inicio", async (rol, pantalla) => {
    const login = vi.fn().mockResolvedValue(crearUsuario([rol]));
    renderLogin(login);
    await seleccionarPerfil(rol);
    fireEvent.click(await screen.findByRole("button", { name: "Entrar" }));
    expect(await screen.findByText(pantalla)).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith(PERFIL_POR_ROL[rol].email);
  });

  it("mientras autentica deshabilita el botón y todavía no redirige", async () => {
    renderLogin(vi.fn(() => new Promise<never>(() => {})));
    fireEvent.click(await screen.findByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("button", { name: "Entrando…" })).toBeDisabled();
    expect(screen.queryByText("Panel de la propietaria")).not.toBeInTheDocument();
  });

  it("si falla el ingreso, informa el error y permite reintentar", async () => {
    const login = vi.fn().mockRejectedValueOnce(errorHttp(500, "ERROR_SERVIDOR")).mockResolvedValueOnce(crearUsuario(["PROFESORA"]));
    renderLogin(login);
    fireEvent.click(await screen.findByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo iniciar sesión con ese perfil.");

    fireEvent.click(await screen.findByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
    expect(login).toHaveBeenCalledTimes(2);
  });
});
