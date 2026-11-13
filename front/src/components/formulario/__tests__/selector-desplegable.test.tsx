import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SelectorDesplegable } from "../selector-desplegable";

describe("SelectorDesplegable", () => {
  it("renderiza correctamente y responde a clics en la lista desplegable", () => {
    const alCambiar = vi.fn();
    render(
      <SelectorDesplegable
        id="filtro-prueba"
        etiqueta="Plan"
        valor=""
        todos="Todos los planes"
        opciones={[
          { id: "1", nombre: "Plan Básico" },
          { id: "2", nombre: "Plan Premium" },
        ]}
        onChange={alCambiar}
      />
    );

    // Muestra la opción actual o "Todos los planes" en el trigger
    expect(screen.getByRole("button")).toHaveTextContent("Todos los planes");

    // Al hacer clic en el trigger abre el menú flotante
    fireEvent.click(screen.getByRole("button"));
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();

    // Selecciona Plan Premium
    fireEvent.click(within(listbox).getByText("Plan Premium"));
    expect(alCambiar).toHaveBeenCalledWith("2");
  });

  it("responde a fireEvent.change en el select nativo para compatibilidad con tests", () => {
    const alCambiar = vi.fn();
    render(
      <SelectorDesplegable
        id="filtro-test"
        etiqueta="Profesora"
        valor="1"
        opciones={[
          { valor: "1", texto: "Lucía Gómez" },
          { valor: "2", texto: "Carla Ruiz" },
        ]}
        onChange={alCambiar}
      />
    );

    const select = screen.getByLabelText("Profesora");
    fireEvent.change(select, { target: { value: "2" } });
    expect(alCambiar).toHaveBeenCalledWith("2");
  });
});
