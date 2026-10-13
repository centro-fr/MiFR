import { render, screen } from "@testing-library/react";
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

  it("muestra el comprobante digital con todos sus datos y badges", () => {
    mockUseComprobante.mockReturnValue({
      data: comprobanteEjemplo,
      isLoading: false,
      error: null,
    });

    render(<ModalComprobante idPago={42} abierto={true} onClose={vi.fn()} />);

    expect(screen.getByText("CENTRO DE ENTRENAMIENTO FR")).toBeInTheDocument();
    expect(screen.getByText("N° 000042")).toBeInTheDocument();
    expect(screen.getByText("Valentina Herrera")).toBeInTheDocument();
    expect(screen.getByText(/DNI: 43123456/i)).toBeInTheDocument();
    expect(screen.getByText("Plan Básico")).toBeInTheDocument();
    expect(screen.getByText("Cuota N° 2")).toBeInTheDocument();
    expect(screen.getByText("Cobro en efectivo confirmado")).toBeInTheDocument();
    expect(screen.getByText("Pendiente de rendición")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Imprimir \/ Guardar comprobante/i }),
    ).toBeInTheDocument();
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
});
