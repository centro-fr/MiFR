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

// Estas pruebas cubren el selector de cuentas de prueba del login con autenticación mock.
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

const CUENTA_POR_ROL: Record<RoleCode, { nombre: RegExp; email: string }> = {
  PROPIETARIA: { nombre: /Marina Sosa/, email: "marina.sosa@example.com" },
  PROFESORA: { nombre: /Lucía Gómez/, email: "lucia.gomez@example.com" },
  ALUMNO: { nombre: /Camila Pérez/, email: "camila.perez@example.com" },
  TUTOR: { nombre: /Mariana López/, email: "mariana.lopez@example.com" },
};

async function abrirSelector() {
  fireEvent.click(await screen.findByRole("button", { name: "Continuar con Google" }));
  return screen.findByRole("dialog", { name: "Elegí una cuenta" });
}

async function elegirCuenta(rol: RoleCode) {
  await abrirSelector();
  fireEvent.click(await screen.findByRole("button", { name: CUENTA_POR_ROL[rol].nombre }));
}

// US-01: selector de cuentas mock y estados del flujo de autenticación de desarrollo.
describe("LoginPage (US-01)", () => {
  it("con mocks muestra la tarjeta de ingreso, sin selector abierto ni mensajes de error", async () => {
    renderLogin(vi.fn());
    expect(await screen.findByRole("heading", { name: "Entrá a MiFR" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("el selector ofrece una cuenta por perfil con su etiqueta", async () => {
    renderLogin(vi.fn());
    const selector = await abrirSelector();
    expect(selector).toHaveTextContent("Propietaria + Profesora");
    expect(selector).toHaveTextContent("Tutor + 2 alumnos a cargo");
  });

  it.each([
    ["PROPIETARIA", "Panel de la propietaria"],
    ["PROFESORA", "Inicio"],
    ["ALUMNO", "Inicio"],
  ] as [RoleCode, string][])("al elegir la cuenta de %s ingresa a su pantalla de inicio", async (rol, pantalla) => {
    const login = vi.fn().mockResolvedValue(crearUsuario([rol]));
    renderLogin(login);
    await elegirCuenta(rol);
    expect(await screen.findByText(pantalla)).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith(CUENTA_POR_ROL[rol].email);
  });

  it("mientras autentica cierra el selector, muestra que está conectando y todavía no redirige", async () => {
    renderLogin(vi.fn(() => new Promise<never>(() => {})));
    await elegirCuenta("PROPIETARIA");
    expect(await screen.findByRole("status")).toHaveTextContent("Conectando con Google…");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Panel de la propietaria")).not.toBeInTheDocument();
  });

  it("si falla el ingreso, informa el error y permite reintentar", async () => {
    const login = vi
      .fn()
      .mockRejectedValueOnce(errorHttp(500, "ERROR_SERVIDOR"))
      .mockResolvedValueOnce(crearUsuario(["PROFESORA"]));
    renderLogin(login);
    await elegirCuenta("PROFESORA");
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos iniciar sesión");

    fireEvent.click(await screen.findByRole("button", { name: "Reintentar con Google" }));
    fireEvent.click(await screen.findByRole("button", { name: CUENTA_POR_ROL.PROFESORA.nombre }));
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
    expect(login).toHaveBeenCalledTimes(2);
  });

  it("si cierra el selector sin elegir, avisa que se canceló y no inicia sesión", async () => {
    const login = vi.fn();
    renderLogin(login);
    await abrirSelector();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cerraste la ventana de Google");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});
