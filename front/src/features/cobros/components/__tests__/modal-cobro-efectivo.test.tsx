import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ModalCobroEfectivo } from "../modal-cobro-efectivo";

const mutateAsyncMock = vi.fn();

vi.mock("../../hooks/use-cobros", () => ({
  useRegistrarCobroEfectivo: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

const mockPermissions = {
  hasRole: vi.fn(),
  hasPermission: vi.fn(),
};

vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => mockPermissions,
}));

describe("ModalCobroEfectivo (US-15)", () => {
  const alumnoPrueba = {
    id_alumno: 3,
    nombre: "Sofía",
    apellido: "Medina",
    dni: "42123456",
  };

  const inscripcionPrueba = {
    id_inscripcion: 3,
    nombre_plan: "Plan Básico",
    precio_vigente: 25000,
    situacion_cuota: {
      estado: "VENCIDA" as const,
      fecha_vencimiento: "2026-10-01",
      dias_restantes: -11,
      puede_asistir: true,
      tiene_pago_pendiente: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions.hasRole.mockReturnValue(false);
    mockPermissions.hasPermission.mockReturnValue(true);
  });

  it("propone por defecto el precio vigente del plan y muestra los datos del alumno", () => {
    render(
      <ModalCobroEfectivo
        abierto={true}
        onClose={vi.fn()}
        alumno={alumnoPrueba}
        inscripcion={inscripcionPrueba}
        onExito={vi.fn()}
      />,
    );

    expect(screen.getByText("Sofía Medina")).toBeInTheDocument();
    expect(screen.getByText("Plan Básico")).toBeInTheDocument();
    expect(screen.getByText("Vencida")).toBeInTheDocument();

    const inputMonto = screen.getByLabelText(/Monto cobrado/i);
    expect(inputMonto).toHaveValue("25000");
  });

  it("registra el cobro exitosamente al confirmar con el precio vigente", async () => {
    mutateAsyncMock.mockResolvedValueOnce({ id_pago: 99 });
    const onExito = vi.fn();

    render(
      <ModalCobroEfectivo
        abierto={true}
        onClose={vi.fn()}
        alumno={alumnoPrueba}
        inscripcion={inscripcionPrueba}
        onExito={onExito}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirmar cobro/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        id_inscripcion: 3,
        monto: 25000,
        confirmar_monto_distinto: false,
        observaciones: undefined,
      });
    });

    expect(onExito).toHaveBeenCalledWith(99);
  });

  it("exige confirmación si se ingresa un monto distinto del precio del plan", async () => {
    render(
      <ModalCobroEfectivo
        abierto={true}
        onClose={vi.fn()}
        alumno={alumnoPrueba}
        inscripcion={inscripcionPrueba}
        onExito={vi.fn()}
      />,
    );

    const inputMonto = screen.getByLabelText(/Monto cobrado/i);
    fireEvent.change(inputMonto, { target: { value: "20000" } });

    // Debe mostrar la advertencia de monto distinto
    expect(
      screen.getByText(/no coincide con el valor del plan/i),
    ).toBeInTheDocument();

    // Intentar enviar sin marcar la casilla
    fireEvent.click(screen.getByRole("button", { name: /Confirmar cobro/i }));

    expect(
      screen.getByText(/Debés confirmar que el monto a cobrar es distinto/i),
    ).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();

    // Marcar la casilla de confirmación
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    mutateAsyncMock.mockResolvedValueOnce({ id_pago: 101 });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar cobro/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        id_inscripcion: 3,
        monto: 20000,
        confirmar_monto_distinto: true,
        observaciones: undefined,
      });
    });
  });

  it("muestra el aviso de pendiente de rendición si quien cobra es una profesora (US-19)", () => {
    mockPermissions.hasRole.mockImplementation((rol: string) => rol === "PROFESORA");

    render(
      <ModalCobroEfectivo
        abierto={true}
        onClose={vi.fn()}
        alumno={alumnoPrueba}
        inscripcion={inscripcionPrueba}
        onExito={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/pendiente de rendición/i),
    ).toBeInTheDocument();
  });
});
