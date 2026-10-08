import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthFormBlock } from "@/features/auth/components/auth-form-block";

// US-01: con una cuenta no habilitada tiene que haber UN solo camino para contactar a la administración.
describe("AuthFormBlock", () => {
  it("acceso no habilitado: hay un solo botón para contactar a la administración", () => {
    render(
      <AuthFormBlock
        errorCode="ACCESO_NO_HABILITADO"
        isLoading={false}
        onLogin={vi.fn()}
        onRetry={vi.fn()}
        onClear={vi.fn()}
        onContact={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: /contactar administración/i })).toHaveLength(1);
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
        onContact={vi.fn()}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Iniciando sesión" })).toBeInTheDocument();
  });
});
