import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Transferencia } from "@/types/transferencia";
import { ModalRechazarTransferencia } from "../modal-rechazar-transferencia";

const transferencia: Transferencia = {
  id: 10,
  estado: "PENDIENTE",
  monto: 30000,
  cargadaEl: "2026-10-12T10:00:00.000Z",
  realizadaEl: "2026-10-12T09:00:00.000Z",
  titularCuenta: null,
  observaciones: null,
  resueltaEl: null,
  motivoRechazo: null,
  alumno: { id: 1, nombre: "Mateo", apellido: "Fernández" },
  horasDesdeLaCarga: 3,
  superaPlazo: false,
};

function renderModal(props: Partial<React.ComponentProps<typeof ModalRechazarTransferencia>> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ModalRechazarTransferencia
      transferencia={transferencia}
      rechazando={false}
      error={null}
      onClose={onClose}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, onClose };
}

describe("ModalRechazarTransferencia (US-17)", () => {
  it("muestra el nombre del alumno y el campo de motivo obligatorio", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Rechazar transferencia", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText(/Mateo Fernández/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo del rechazo/i)).toBeInTheDocument();
  });

  it("no deja rechazar sin motivo", () => {
    const { onConfirm } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Rechazar transferencia" }));

    expect(screen.getByText("Ingresá un motivo para poder rechazar.")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("no acepta un motivo que son solo espacios", () => {
    const { onConfirm } = renderModal();

    fireEvent.change(screen.getByLabelText(/Motivo del rechazo/i), { target: { value: "     " } });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar transferencia" }));

    expect(screen.getByText("Ingresá un motivo para poder rechazar.")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("no acepta un motivo sin ninguna letra", () => {
    const { onConfirm } = renderModal();

    fireEvent.change(screen.getByLabelText(/Motivo del rechazo/i), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar transferencia" }));

    expect(screen.getByText("El motivo tiene que tener al menos una letra.")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirma con el motivo escrito, sin espacios de los bordes", () => {
    const { onConfirm } = renderModal();

    fireEvent.change(screen.getByLabelText(/Motivo del rechazo/i), { target: { value: "  El monto no coincide  " } });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar transferencia" }));

    expect(onConfirm).toHaveBeenCalledWith("El monto no coincide");
  });

  it("completa el motivo al elegir uno de los frecuentes", () => {
    const { onConfirm } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "No se encontró la transferencia en el extracto" }));
    expect(screen.getByLabelText(/Motivo del rechazo/i)).toHaveValue("No se encontró la transferencia en el extracto");

    fireEvent.click(screen.getByRole("button", { name: "Rechazar transferencia" }));
    expect(onConfirm).toHaveBeenCalledWith("No se encontró la transferencia en el extracto");
  });

  it("pasa a una sola línea un motivo con saltos de línea", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Motivo del rechazo/i), { target: { value: "No llegó\nel dinero" } });

    expect(screen.getByLabelText(/Motivo del rechazo/i)).toHaveValue("No llegó el dinero");
  });

  it("quita el error de validación al empezar a escribir", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Rechazar transferencia" }));
    expect(screen.getByText("Ingresá un motivo para poder rechazar.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Motivo del rechazo/i), { target: { value: "N" } });
    expect(screen.queryByText("Ingresá un motivo para poder rechazar.")).not.toBeInTheDocument();
  });

  it("deshabilita los botones mientras rechaza", () => {
    renderModal({ rechazando: true });

    expect(screen.getByRole("button", { name: "Rechazando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("avisa que la transferencia sigue pendiente si el rechazo falla y permite reintentar", () => {
    renderModal({ error: new Error("falló") });

    expect(screen.getByRole("alert")).toHaveTextContent("La transferencia sigue pendiente: no se aplicó ningún cambio.");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("cierra con Cancelar sin confirmar nada", () => {
    const { onClose, onConfirm } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
