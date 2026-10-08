import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthStateBanner } from "@/features/auth/components/auth-state-banner";
import type { AuthErrorCode } from "@/types/auth";

function renderBanner(code: AuthErrorCode) {
  render(<AuthStateBanner code={code} onContact={vi.fn()} onRetry={vi.fn()} />);
  return screen.getByRole("alert");
}

// US-01, casos borde: cada error tiene que explicar su causa real.
describe("AuthStateBanner", () => {
  it("token de Google inválido: dice que no se pudo validar la cuenta, sin hablar de la conexión", () => {
    const alerta = renderBanner("INVALID_GOOGLE_TOKEN");
    expect(alerta).toHaveTextContent("No pudimos validar tu cuenta de Google");
    expect(alerta).not.toHaveTextContent(/conexión/i);
  });

  it("popup bloqueado: pide habilitar los popups", () => {
    expect(renderBanner("POPUP_BLOQUEADO")).toHaveTextContent("Habilitá los popups");
  });

  it("error de red: mantiene el mensaje de conexión", () => {
    expect(renderBanner("RED_ERROR")).toHaveTextContent("Verificá tu conexión");
  });

  it("popup cancelado: muestra 'Inicio cancelado'", () => {
    expect(renderBanner("POPUP_CANCELADO")).toHaveTextContent("Inicio cancelado");
  });

  it.each<AuthErrorCode>(["ACCESO_NO_HABILITADO", "USUARIO_INACTIVO"])("%s: muestra 'Acceso no habilitado'", (codigo) => {
    expect(renderBanner(codigo)).toHaveTextContent("Acceso no habilitado");
  });

  it("código desconocido: usa el mensaje genérico en vez de romper", () => {
    const alerta = renderBanner("CODIGO_NUEVO" as AuthErrorCode);
    expect(alerta).toHaveTextContent("No pudimos iniciar sesión");
  });

  it("error de servidor: no habla de la conexión", () => {
    const alerta = renderBanner("ERROR_SERVIDOR");
    expect(alerta).toHaveTextContent("El servidor tuvo un problema");
    expect(alerta).not.toHaveTextContent(/conexión/i);
  });
});
