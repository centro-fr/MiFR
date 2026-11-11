import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalComprobante } from "../modal-comprobante";
import { formatearPrecio } from "@/utils/moneda";

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

  it("muestra el comprobante digital sobrio con cabecera, cuerpo y pie institucional", () => {
    mockUseComprobante.mockReturnValue({
      data: comprobanteEjemplo,
      isLoading: false,
      error: null,
    });

    render(<ModalComprobante idPago={42} abierto={true} onClose={vi.fn()} />);

    // Cabecera institucional
    expect(screen.getByText("CENTRO DE ENTRENAMIENTO FR")).toBeInTheDocument();
    expect(screen.getByText("Comprobante de cobro digital")).toBeInTheDocument();
    expect(screen.getByText("N° 000042")).toBeInTheDocument();

    // Cuerpo con datos ordenados y legibles
    expect(screen.getByText("Monto cobrado")).toBeInTheDocument();
    expect(screen.getByText(/25\.000/)).toBeInTheDocument();
    expect(screen.getByText("Valentina Herrera")).toBeInTheDocument();
    expect(screen.getByText(/DNI: 43123456/i)).toBeInTheDocument();
    expect(screen.getByText("Plan Básico")).toBeInTheDocument();
    expect(screen.getByText("Cuota N° 2")).toBeInTheDocument();
    expect(screen.getByText("Receptor / Registrado por")).toBeInTheDocument();
    expect(screen.getByText("Profesora: Carla Ruiz")).toBeInTheDocument();

    // Sin badges saturados ni innecesarios en el contenido
    expect(screen.queryByText("Cobro en efectivo confirmado")).not.toBeInTheDocument();
    expect(screen.queryByText("Pendiente de rendición")).not.toBeInTheDocument();

    // Pie de acciones
    expect(
      screen.getByRole("button", { name: /Imprimir \/ Guardar comprobante/i }),
    ).toBeInTheDocument();
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

    expect(screen.getByText("Administración: Carla Ruiz")).toBeInTheDocument();
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
