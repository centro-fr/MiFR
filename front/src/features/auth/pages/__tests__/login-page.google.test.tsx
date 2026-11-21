import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { getSessionToken } from "@/features/auth/api/session-token";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { LoginPage } from "@/features/auth/pages/login-page";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";

// Modo real: hay Client ID de Google. El popup de Google se reemplaza por dos botones que simulan sus dos resultados.
vi.hoisted(() => {
  vi.stubEnv("VITE_USE_MOCKS", "");
  vi.stubEnv("VITE_LOGIN_DESARROLLO", "");
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-id-de-prueba");
});
vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/auth/components/gis-official-overlay", () => ({
  GisOfficialOverlay: ({ onCredential, onError }: { onCredential: (c: string) => void; onError: () => void }) => (
    <>
      <button onClick={() => onCredential("id-token-de-google")}>Simular: Google entrega credencial</button>
      <button onClick={onError}>Simular: usuario cierra el popup de Google</button>
    </>
  ),
}));

function renderLogin() {
  const login = vi.fn().mockResolvedValue(crearUsuario(["PROPIETARIA"]));
  vi.mocked(useAuth).mockReturnValue({ ...crearSesion(null), login });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app/dashboard" element={<p>Panel de la propietaria</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return login;
}

// US-01: login con Google real (credencial) y criterio "Login cancelado a mitad del proceso → no genera sesión".
describe("LoginPage con Google (US-01)", () => {
  it("cuenta de Google válida: envía al login el ID token que entregó Google e ingresa", async () => {
    const login = renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /google entrega credencial/i }));
    expect(await screen.findByText("Panel de la propietaria")).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith("id-token-de-google");
  });

  it("login cancelado a mitad del proceso: avisa que se cerró la ventana de Google y no genera sesión", () => {
    const login = renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /cierra el popup/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Cerraste la ventana de Google");
    expect(login).not.toHaveBeenCalled();
    expect(getSessionToken()).toBeNull();
    expect(screen.queryByText("Panel de la propietaria")).not.toBeInTheDocument();
  });
});
