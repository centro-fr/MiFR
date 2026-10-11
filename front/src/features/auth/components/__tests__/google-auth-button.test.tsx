import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";

function renderBoton(props: Partial<Parameters<typeof GoogleAuthButton>[0]> = {}) {
  const onLogin = vi.fn();
  const onRetry = vi.fn();
  render(<GoogleAuthButton isLoading={false} hasError={false} isConnectionError={false} onLogin={onLogin} onRetry={onRetry} {...props} />);
  return { onLogin, onRetry };
}

// US-01, estados "Pantalla de login", "Loading" y acción "Reintentar si falla".
describe("GoogleAuthButton", () => {
  it("pantalla de login: muestra 'Iniciar sesión con Google' y al hacer clic inicia el login", () => {
    const { onLogin } = renderBoton();
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión con google/i }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("autenticando: muestra el estado de carga y no deja volver a hacer clic", () => {
    renderBoton({ isLoading: true });
    expect(screen.getByRole("status", { name: "Iniciando sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("falló el login por conexión o popup: ofrece 'Reintentar con Google'", () => {
    const { onRetry, onLogin } = renderBoton({ hasError: true, isConnectionError: true });
    fireEvent.click(screen.getByRole("button", { name: /reintentar con google/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("falló por acceso no habilitado o token: ofrece 'Volver a intentar'", () => {
    const { onRetry } = renderBoton({ hasError: true, isConnectionError: false });
    fireEvent.click(screen.getByRole("button", { name: /volver a intentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
