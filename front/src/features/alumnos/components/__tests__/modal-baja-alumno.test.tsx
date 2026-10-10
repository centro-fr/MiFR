import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalBajaAlumno } from "@/features/alumnos/components/modal-baja-alumno";
import { crearFicha } from "@/features/alumnos/__tests__/ficha-de-prueba";

// jsdom no trae ResizeObserver y el RadioGroup de Radix lo usa para medir.
vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

function renderizarModal(props: Partial<Parameters<typeof ModalBajaAlumno>[0]> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ModalBajaAlumno
      alumno={crearFicha()}
      dandoDeBaja={false}
      errorBaja={null}
      onClose={onClose}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, onClose };
}

describe("US-08: ModalBajaAlumno", () => {
  it("explica que la baja conserva el historial", () => {
    renderizarModal();

    expect(screen.getByText(/se conservará todo su historial/)).toBeInTheDocument();
  });

  // El DER exige motivo_baja cuando la inscripción pasa a BAJA.
  it("no confirma sin elegir un motivo y avisa que es obligatorio", () => {
    const { onConfirm } = renderizarModal();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar baja" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Elegí el motivo de la baja.");
  });

  it("confirma con el código del motivo elegido", () => {
    const { onConfirm } = renderizarModal();

    fireEvent.click(screen.getByRole("radio", { name: "Mudanza" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar baja" }));

    expect(onConfirm).toHaveBeenCalledWith("MUDANZA");
  });

  // CAMBIO_PLAN lo pone solo el cambio de plan: el back no lo acepta en la baja.
  it("ofrece los cinco motivos que acepta el back, sin cambio de plan", () => {
    renderizarModal();

    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.queryByRole("radio", { name: "Cambio de plan" })).not.toBeInTheDocument();
  });

  it("muestra el error que devuelve la API", () => {
    renderizarModal({ errorBaja: "El alumno ya está dado de baja" });

    expect(screen.getByText("El alumno ya está dado de baja")).toBeInTheDocument();
  });

  it("deshabilita las acciones mientras se procesa la baja", () => {
    renderizarModal({ dandoDeBaja: true });

    expect(screen.getByRole("button", { name: "Dando de baja..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("cierra al cancelar", () => {
    const { onClose } = renderizarModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
