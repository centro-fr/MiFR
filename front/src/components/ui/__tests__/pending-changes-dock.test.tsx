import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PendingChangesDock } from "../pending-changes-dock";

function renderizarDock(props: Partial<React.ComponentProps<typeof PendingChangesDock>> = {}) {
  const onGuardar = vi.fn();
  const onDescartar = vi.fn();
  render(<PendingChangesDock cantidad={2} guardando={false} onGuardar={onGuardar} onDescartar={onDescartar} {...props} />);
  return { onGuardar, onDescartar };
}

describe("PendingChangesDock", () => {
  it("informa la cantidad de cambios sin guardar en singular y plural", () => {
    const { unmount } = render(
      <PendingChangesDock cantidad={1} guardando={false} onGuardar={vi.fn()} onDescartar={vi.fn()} />,
    );
    expect(screen.getByText("1 cambio sin guardar")).toBeInTheDocument();
    unmount();

    renderizarDock({ cantidad: 3 });
    expect(screen.getByText("3 cambios sin guardar")).toBeInTheDocument();
  });

  it("guarda con un solo toque", () => {
    const { onGuardar } = renderizarDock();
    fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));
    expect(onGuardar).toHaveBeenCalledTimes(1);
  });

  it("pide un segundo toque para descartar, así un toque accidental no pierde el borrador", () => {
    const { onDescartar } = renderizarDock();

    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onDescartar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "¿Descartar?" }));
    expect(onDescartar).toHaveBeenCalledTimes(1);
  });

  it("bloquea las acciones mientras guarda", () => {
    renderizarDock({ guardando: true });
    expect(screen.getByRole("button", { name: /Guardando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descartar" })).toBeDisabled();
  });

  it("apila el mensaje y los botones en mobile y los pone en una fila desde sm", () => {
    renderizarDock();
    const barra = screen.getByText("Se aplican al guardar").closest("div.flex-col");
    expect(barra).toHaveClass("flex-col", "sm:flex-row");
    expect(screen.getByRole("button", { name: /Guardar cambios/i })).toHaveClass("flex-1", "sm:flex-none");
  });
});
