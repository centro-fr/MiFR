import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilaMovil } from "../fila-movil";

function renderizar(props: Partial<Parameters<typeof FilaMovil>[0]> = {}) {
  const onAbrir = vi.fn();
  const onEditar = vi.fn();
  render(
    <ul>
      <FilaMovil
        titulo="Plan Básico"
        detalle="Mensual · 2 clases por semana · $25.000 por mes"
        avatar="Lucía Gómez"
        onAbrir={onAbrir}
        acciones={
          <button type="button" onClick={onEditar}>
            Editar
          </button>
        }
        {...props}
      />
    </ul>,
  );
  return { onAbrir, onEditar };
}

describe("FilaMovil", () => {
  it("muestra el título, la línea de detalle y las iniciales del avatar", () => {
    renderizar();

    expect(screen.getByText("Plan Básico")).toBeInTheDocument();
    expect(screen.getByText("Mensual · 2 clases por semana · $25.000 por mes")).toBeInTheDocument();
    expect(screen.getByText("LG")).toBeInTheDocument();
  });

  it("tocar la fila la abre; tocar una acción hace solo la acción", () => {
    const { onAbrir, onEditar } = renderizar();

    fireEvent.click(screen.getByText("Plan Básico"));
    expect(onAbrir).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it("sin avatar no muestra iniciales", () => {
    renderizar({ avatar: undefined });

    expect(screen.queryByText("LG")).not.toBeInTheDocument();
  });
});
