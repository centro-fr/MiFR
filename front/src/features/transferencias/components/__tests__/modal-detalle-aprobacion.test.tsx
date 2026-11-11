import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalDetalleAprobacion } from "../modal-detalle-aprobacion";
import type { Transferencia } from "@/types/transferencia";

vi.mock("@/features/alumnos/hooks/use-alumnos", () => ({
  useAlumno: vi.fn(() => ({
    data: {
      id_alumno: 3,
      usuario: { nombre: "Valentina", apellido: "Herrera" },
      inscripcion: {
        id_inscripcion: 3,
        id_promocion: 1,
        plan: { id_plan: 2, nombre: "Plan Intermedio", precio: 30000 },
        situacion_cuota: { estado: "VENCIDA" },
      },
    },
  })),
}));

vi.mock("@/features/promociones/hooks/use-promociones", () => ({
  usePromociones: vi.fn(() => ({
    data: [
      {
        id: "1",
        codigo: "VERANO",
        nombre: "Promo Verano",
        tipoDescuento: "PORCENTAJE",
        valor: 20,
        planes: [{ id: "2", nombre: "Plan Intermedio" }],
        activo: true,
        estado: "ACTIVA",
      },
    ],
  })),
}));

const transferenciaMock: Transferencia = {
  id: 8,
  estado: "PENDIENTE",
  monto: 24000,
  cargadaEl: "2026-11-10T00:00:00.000Z",
  realizadaEl: "2026-11-09T22:27:00.000Z",
  titularCuenta: "Herrera Valentina",
  observaciones: null,
  resueltaEl: null,
  motivoRechazo: null,
  alumno: { id: 3, nombre: "Valentina", apellido: "Herrera" },
  horasDesdeLaCarga: 26,
  superaPlazo: true,
};

describe("ModalDetalleAprobacion", () => {
  it("no muestra el badge de tiempo redundante arriba a la derecha", () => {
    render(
      <ModalDetalleAprobacion
        transferencia={transferenciaMock}
        open={true}
        onClose={vi.fn()}
        onAprobar={vi.fn()}
        onRechazar={vi.fn()}
      />,
    );

    // No debe haber un span con clase rounded-full diciendo "Hace 26 h" al lado del monto
    expect(screen.queryByText(/^Hace 26 h$/)).not.toBeInTheDocument();
  });

  it("no muestra la fila 'Tipo de pago'", () => {
    render(
      <ModalDetalleAprobacion
        transferencia={transferenciaMock}
        open={true}
        onClose={vi.fn()}
        onAprobar={vi.fn()}
        onRechazar={vi.fn()}
      />,
    );

    expect(screen.queryByText("Tipo de pago")).not.toBeInTheDocument();
  });

  it("muestra la fila 'Promoción' indicando la promo y descuento aplicados", () => {
    render(
      <ModalDetalleAprobacion
        transferencia={transferenciaMock}
        open={true}
        onClose={vi.fn()}
        onAprobar={vi.fn()}
        onRechazar={vi.fn()}
      />,
    );

    expect(screen.getByText("Promoción")).toBeInTheDocument();
    expect(screen.getByText("Promo Verano (20% OFF)")).toBeInTheDocument();
  });

  it("muestra 'Sin promoción' cuando el alumno no tiene ninguna promo", async () => {
    const { useAlumno } = await import("@/features/alumnos/hooks/use-alumnos");
    vi.mocked(useAlumno).mockReturnValueOnce({
      data: {
        id_alumno: 3,
        usuario: { nombre: "Valentina", apellido: "Herrera" },
        inscripcion: {
          id_inscripcion: 3,
          id_promocion: null,
          plan: { id_plan: 2, nombre: "Plan Intermedio", precio: 30000 },
          situacion_cuota: { estado: "VENCIDA" },
        },
      },
    } as any);

    render(
      <ModalDetalleAprobacion
        transferencia={{ ...transferenciaMock, monto: 30000 }}
        open={true}
        onClose={vi.fn()}
        onAprobar={vi.fn()}
        onRechazar={vi.fn()}
      />,
    );

    expect(screen.getByText("Promoción")).toBeInTheDocument();
    expect(screen.getByText("Sin promoción")).toBeInTheDocument();
  });
});
