import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AlumnoDetalle } from "@/features/alumnos/schemas/alumno";
import { HistorialCobrosAlumno } from "../historial-cobros-alumno";

vi.mock("@/features/cobros/components/modal-comprobante", () => ({ ModalComprobante: () => null }));

function pago(id_pago: number, cambios: object = {}) {
  return {
    id_pago,
    forma_pago: "EFECTIVO",
    estado: "CONFIRMADO",
    monto: 25000,
    fecha_pago: "2026-10-18T12:00:00.000Z",
    motivo_rechazo: null,
    ...cambios,
  };
}

const ALUMNO = {
  id_alumno: 3,
  inscripciones: [{ id_inscripcion: 34, plan: { nombre: "Plan Básico" } }],
  inscripciones_de_la_baja: [],
  historial_cuotas: [
    {
      id_cuota: 1,
      id_inscripcion: 3,
      plan: "Plan Intermedio",
      numero_cuota: 1,
      fecha_vencimiento: "2026-10-01",
      monto: 25000,
      pagos: [pago(1)],
    },
    {
      id_cuota: 2,
      id_inscripcion: 34,
      plan: "Plan Básico",
      numero_cuota: 1,
      fecha_vencimiento: "2026-10-01",
      monto: 25000,
      pagos: [pago(2)],
    },
    {
      id_cuota: 3,
      id_inscripcion: 99,
      plan: "Plan ajeno",
      numero_cuota: 1,
      fecha_vencimiento: "2026-10-01",
      monto: 25000,
      pagos: [pago(3)],
    },
  ],
} as unknown as AlumnoDetalle;

describe("HistorialCobrosAlumno", () => {
  it("dice de qué plan fue cada cobro: el que trae el pago o el de su inscripción", () => {
    render(<HistorialCobrosAlumno alumno={ALUMNO} />);

    expect(screen.getByRole("columnheader", { name: "Plan" })).toBeInTheDocument();
    const [, ...filas] = screen.getAllByRole("row");
    expect(filas.map((fila) => within(fila).getAllByRole("cell")[2].textContent)).toEqual([
      "Plan Intermedio",
      "Plan Básico",
      "Plan ajeno",
    ]);
  });
});
