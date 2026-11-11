import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalComprobante } from "../modal-comprobante";

const mockUseComprobante = vi.fn();

vi.mock("../../hooks/use-cobros", () => ({
  useComprobante: (idPago: number | null, abierto: boolean) => mockUseComprobante(idPago, abierto),
}));

describe("ModalComprobante (US-15)", () => {
  const comprobanteEjemplo = {
    numero: 42,
    fecha: "2026-10-12T18:00:00.000Z",
    forma_pago: "EFECTIVO" as const,
    monto: 25000,
    alumno: {
      nombre: "Valentina",
      apellido: "Herrera",
      dni: "43123456",
    },
    plan: "Plan Básico",
    cuota: {
      numero: 2,
      vencimiento: "2026-10-12T00:00:00.000Z",
    },
    registrado_por: {
      nombre: "Carla",
      apellido: "Ruiz",
    },
    profesora_cobra: {
      nombre: "Carla",
      apellido: "Ruiz",
    },
  };

  it("muestra la cabecera (Logo FR + Comprobante Digital) y el detalle en forma de filas", () => {
    mockUseComprobante.mockReturnValue({
      data: comprobanteEjemplo,
      isLoading: false,
      error: null,
    });

    render(<ModalComprobante idPago={42} abierto={true} onClose={vi.fn()} />);

    // Cabecera sobria: Logo FR + Comprobante Digital
    expect(screen.getAllByText("Comprobante Digital").length).toBeGreaterThan(0);
    expect(screen.getAllByText("N° 000042").length).toBeGreaterThan(0);

    // Detalle en forma de filas
    expect(screen.getAllByText("Alumno").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Valentina Herrera/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DNI: 43123456/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Plan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Plan Básico").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cuota").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cuota N° 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fecha de cobro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Receptor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Profesora: Carla Ruiz").length).toBeGreaterThan(0);

    // Monto cobrado como fila final destacada
    expect(screen.getAllByText("Monto cobrado").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/25\.000/).length).toBeGreaterThan(0);

    // Acciones del footer
    expect(screen.getByRole("button", { name: /Imprimir \/ Guardar comprobante/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Cerrar$/i })).toBeInTheDocument();
  });

  it("muestra receptor de administración cuando no cobró una profesora puntual", () => {
    mockUseComprobante.mockReturnValue({
      data: {
        ...comprobanteEjemplo,
        profesora_cobra: null,
      },
      isLoading: false,
      error: null,
    });

    render(<ModalComprobante idPago={42} abierto={true} onClose={vi.fn()} />);

    expect(screen.getAllByText("Administración: Carla Ruiz").length).toBeGreaterThan(0);
  });

  it("muestra estado de carga mientras obtiene el comprobante", () => {
    mockUseComprobante.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<ModalComprobante idPago={42} abierto={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Generando comprobante digital/i)).toBeInTheDocument();
  });

  it("muestra mensaje de error si falla la obtención del comprobante", () => {
    mockUseComprobante.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Network error"),
    });

    render(<ModalComprobante idPago={42} abierto={true} onClose={vi.fn()} />);

    expect(screen.getByText("No se pudo cargar el comprobante")).toBeInTheDocument();
    expect(
      screen.getByText(/El cobro fue registrado correctamente, pero no se pudo obtener/i),
    ).toBeInTheDocument();
  });

  it("permite disparar la impresión con el título institucional configurado", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    mockUseComprobante.mockReturnValue({
      data: comprobanteEjemplo,
      isLoading: false,
      error: null,
    });

    render(<ModalComprobante idPago={42} abierto={true} onClose={vi.fn()} />);

    const botonImprimir = screen.getByRole("button", {
      name: /Imprimir \/ Guardar comprobante/i,
    });
    fireEvent.click(botonImprimir);

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("Centro de Entrenamiento FR");

    printSpy.mockRestore();
  });
});
