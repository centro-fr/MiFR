import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthFormBlock } from "@/features/auth/components/auth-form-block";

// US-01: el sistema no gestiona solicitudes de acceso, así que una cuenta no habilitada solo ve el aviso.
describe("AuthFormBlock", () => {
  it("acceso no habilitado: avisa sin ofrecer contactar a la administración", () => {
    render(
      <AuthFormBlock
        errorCode="ACCESO_NO_HABILITADO"
        isLoading={false}
        onLogin={vi.fn()}
        onRetry={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Tu cuenta no tiene acceso a MiFR");
    expect(screen.queryByRole("button", { name: /contactar/i })).not.toBeInTheDocument();
  });

  // US-01, estado "Loading": mientras autentica no se muestra el error anterior.
  it("autenticando: no muestra el cartel de error y sí el estado de carga", () => {
    render(
      <AuthFormBlock
        errorCode="RED_ERROR"
        isLoading
        onLogin={vi.fn()}
        onRetry={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Iniciando sesión" })).toBeInTheDocument();
  });
});
