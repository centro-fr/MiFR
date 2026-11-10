import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PromocionDialog } from "../promocion-dialog";

const mockPlanes = [
  { id: "1", nombre: "Plan Básico" },
  { id: "2", nombre: "Plan Intermedio" },
  { id: "3", nombre: "Plan Kids" },
];

describe("PromocionDialog", () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite seleccionar 'Todas las actividades' y marca todos los planes", () => {
    render(
      <PromocionDialog
        abierto={true}
        promocion={null}
        planes={mockPlanes}
        guardando={false}
        error={null}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    const checkTodas = screen.getByLabelText("Todas las actividades");
    expect(checkTodas).not.toBeChecked();

    const checkBasico = screen.getByLabelText("Plan Básico");
    const checkIntermedio = screen.getByLabelText("Plan Intermedio");
    const checkKids = screen.getByLabelText("Plan Kids");

    expect(checkBasico).not.toBeChecked();
    expect(checkIntermedio).not.toBeChecked();
    expect(checkKids).not.toBeChecked();

    // Marcar 'Todas las actividades'
    fireEvent.click(checkTodas);
    expect(checkTodas).toBeChecked();
    expect(checkBasico).toBeChecked();
    expect(checkIntermedio).toBeChecked();
    expect(checkKids).toBeChecked();

    // Desmarcar 'Todas las actividades'
    fireEvent.click(checkTodas);
    expect(checkTodas).not.toBeChecked();
    expect(checkBasico).not.toBeChecked();
    expect(checkIntermedio).not.toBeChecked();
    expect(checkKids).not.toBeChecked();
  });

  it("permite configurar un descuento permanente ocultando la fecha hasta", async () => {
    render(
      <PromocionDialog
        abierto={true}
        promocion={null}
        planes={mockPlanes}
        guardando={false}
        error={null}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    const checkPermanente = screen.getByLabelText("Descuento permanente");
    expect(checkPermanente).not.toBeChecked();

    // Inicialmente el campo 'Hasta' es visible
    expect(screen.getByLabelText("Hasta *")).toBeInTheDocument();

    // Al marcar descuento permanente
    fireEvent.click(checkPermanente);
    expect(checkPermanente).toBeChecked();
    expect(screen.queryByLabelText("Hasta *")).not.toBeInTheDocument();

    // Completar el resto de los campos y guardar
    fireEvent.change(screen.getByLabelText("Código *"), { target: { value: "PROMO100" } });
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Promo Permanente" } });
    fireEvent.change(screen.getByLabelText("Descuento (%) *"), { target: { value: "15" } });
    fireEvent.click(screen.getByLabelText("Todas las actividades"));

    fireEvent.click(screen.getByRole("button", { name: "Guardar promoción" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: "PROMO100",
          nombre: "Promo Permanente",
          permanente: true,
          fechaHasta: "2099-12-31",
          idsPlanes: ["1", "2", "3"],
        }),
        expect.anything()
      );
    });
  });
});
