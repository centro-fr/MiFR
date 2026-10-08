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

// Modo mock del login (sin popup real de Google): el flujo es el mismo, cambia solo de dónde sale el token.
vi.hoisted(() => {
  vi.stubEnv("VITE_USE_MOCKS", "true");
  vi.stubEnv("VITE_LOGIN_DESARROLLO", "");
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
});
vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));

function errorHttp(status: number, code: string) {
  const e = new AxiosError("fallo");
  e.response = { status, data: { error: { code } } } as never;
  return e;
}

function renderLogin(login: AuthContextValue["login"]) {
  vi.mocked(useAuth).mockReturnValue({ ...crearSesion(null), login });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app/dashboard" element={<p>Panel de la propietaria</p>} />
          <Route path="/app/hoy" element={<p>Clases de hoy</p>} />
          <Route path="/app/inicio" element={<p>Inicio del alumno</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// La página renderiza la vista mobile y la de escritorio a la vez (se alterna con CSS), por eso se toma el primer elemento.
function botonGoogle() {
  return screen.getAllByRole("button", { name: /iniciar sesión con google/i })[0];
}

// US-01: criterios de aceptación y estados de la pantalla, probados sobre el flujo completo.
describe("LoginPage (US-01)", () => {
  it("pantalla de login: muestra el botón de Google y ningún mensaje de error", () => {
    renderLogin(vi.fn());
    expect(botonGoogle()).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["PROPIETARIA", "Panel de la propietaria"],
    ["PROFESORA", "Clases de hoy"],
    ["ALUMNO", "Inicio del alumno"],
  ] as [RoleCode, string][])("cuenta registrada con rol %s: ingresa y va a su pantalla de inicio", async (rol, pantalla) => {
    const login = vi.fn().mockResolvedValue(crearUsuario([rol]));
    renderLogin(login);
    fireEvent.click(botonGoogle());
    expect(await screen.findByText(pantalla)).toBeInTheDocument();
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("mientras autentica: muestra 'Iniciando sesión' y todavía no redirige", async () => {
    renderLogin(vi.fn(() => new Promise<never>(() => {})));
    fireEvent.click(botonGoogle());
    expect((await screen.findAllByRole("status", { name: "Iniciando sesión" })).length).toBeGreaterThan(0);
    expect(screen.queryByText("Panel de la propietaria")).not.toBeInTheDocument();
  });

  it("cuenta de Google no registrada: muestra 'Acceso no habilitado' y no ingresa", async () => {
    renderLogin(vi.fn().mockRejectedValue(errorHttp(403, "USUARIO_NO_REGISTRADO")));
    fireEvent.click(botonGoogle());
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("Acceso no habilitado");
    expect(screen.queryByText("Panel de la propietaria")).not.toBeInTheDocument();
  });

  it("error de red al validar el token: avisa de la conexión y permite reintentar hasta ingresar", async () => {
    const login = vi.fn().mockRejectedValueOnce(new AxiosError("Network Error")).mockResolvedValueOnce(crearUsuario(["PROFESORA"]));
    renderLogin(login);
    fireEvent.click(botonGoogle());
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("Verificá tu conexión");

    fireEvent.click(screen.getAllByRole("button", { name: /reintentar con google/i })[0]);
    expect(await screen.findByText("Clases de hoy")).toBeInTheDocument();
    expect(login).toHaveBeenCalledTimes(2);
  });
});
