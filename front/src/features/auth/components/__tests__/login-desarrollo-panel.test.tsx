import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LoginDesarrolloPanel } from "@/features/auth/components/login-desarrollo-panel";
import type { AuthErrorCode } from "@/types/auth";

interface Opciones {
  errorCode?: AuthErrorCode | null;
  isLoading?: boolean;
  escribiendoEmail?: boolean;
}

function renderPanel({ errorCode = null, isLoading = false, escribiendoEmail = false }: Opciones = {}) {
  const handlers = { onElegirCuenta: vi.fn(), onEscribirEmail: vi.fn(), onSubmitEmail: vi.fn() };
  render(
    <MemoryRouter>
      <LoginDesarrolloPanel errorCode={errorCode} isLoading={isLoading} escribiendoEmail={escribiendoEmail} {...handlers} />
    </MemoryRouter>,
  );
  return handlers;
}

// US-01: login de desarrollo (sin Google) con la misma tarjeta que el login real.
describe("LoginDesarrolloPanel", () => {
  it("se ve como el login real, sin carteles de desarrollo, y ofrece elegir una cuenta o escribir un email", () => {
    const { onElegirCuenta, onEscribirEmail } = renderPanel();
    expect(screen.queryByText(/desarrollo/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(onElegirCuenta).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Entrar con otro email" }));
    expect(onEscribirEmail).toHaveBeenCalledTimes(1);
  });

  it("con el formulario de email, entra con el email escrito sin espacios y deja volver a las cuentas", () => {
    const { onSubmitEmail, onElegirCuenta } = renderPanel({ escribiendoEmail: true });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "  marina.sosa@example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(onSubmitEmail).toHaveBeenCalledWith("marina.sosa@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Elegir una cuenta de prueba" }));
    expect(onElegirCuenta).toHaveBeenCalledTimes(1);
  });

  it("si el email no corresponde a un usuario, lo explica", () => {
    renderPanel({ errorCode: "ACCESO_NO_HABILITADO" });
    expect(screen.getByRole("alert")).toHaveTextContent("Ese email no corresponde a ningún usuario dado de alta.");
  });

  it("si cerró el selector sin elegir, el aviso es el de cancelación", () => {
    renderPanel({ errorCode: "POPUP_CANCELADO" });
    expect(screen.getByRole("alert")).toHaveTextContent("Cerraste la ventana de Google");
  });

  it("mientras entra con email deshabilita el botón y no muestra errores viejos", () => {
    renderPanel({ errorCode: "ERROR_SERVIDOR", isLoading: true, escribiendoEmail: true });
    expect(screen.getByRole("button", { name: "Entrando…" })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
