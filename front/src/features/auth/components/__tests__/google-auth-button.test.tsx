import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";

function renderBoton(props: Partial<Parameters<typeof GoogleAuthButton>[0]> = {}) {
  const onClick = vi.fn();
  render(<GoogleAuthButton etiqueta="Continuar con Google" isLoading={false} onClick={onClick} {...props} />);
  return onClick;
}

// US-01, estados "Pantalla de login" y "Loading".
describe("GoogleAuthButton", () => {
  it("pantalla de login: muestra la etiqueta y al hacer clic inicia el login", () => {
    const onClick = renderBoton();
    fireEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("autenticando: muestra el estado de carga y no queda ningún botón para volver a hacer clic", () => {
    renderBoton({ isLoading: true, etiqueta: "Conectando con Google…" });
    expect(screen.getByRole("status")).toHaveTextContent("Conectando con Google…");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("modo real: el botón visual queda oculto para lectores y el interactivo es el de Google", () => {
    renderBoton({ overlay: <button type="button">Botón oficial de Google</button> });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Botón oficial de Google" })).toBeInTheDocument();
  });
});
