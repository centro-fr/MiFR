import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AlumnoDetalle } from "@/features/alumnos/schemas/alumno";
import { useHistorialPagos } from "@/features/cobros/hooks/use-cobros";
import { HistorialCobrosAlumno } from "../historial-cobros-alumno";

vi.mock("@/features/cobros/hooks/use-cobros", () => ({ useHistorialPagos: vi.fn() }));
vi.mock("@/features/cobros/components/modal-comprobante", () => ({ ModalComprobante: () => null }));

function pago(id_pago: number, cambios: object = {}) {
  return {
    id_pago,
    id_cuota: id_pago,
    forma_pago: "EFECTIVO",
    estado: "CONFIRMADO",
    monto: 25000,
    fecha_pago: "2026-10-18T12:00:00.000Z",
    id_usuario_registra: 1,
    rendido: true,
    ...cambios,
  };
}

const ALUMNO = {
  id_alumno: 3,
  inscripciones: [{ id_inscripcion: 34, plan: { nombre: "Plan Básico" } }],
  inscripciones_de_la_baja: [],
} as unknown as AlumnoDetalle;

describe("HistorialCobrosAlumno", () => {
  it("dice de qué plan fue cada cobro: el que trae el pago o el de su inscripción", () => {
    vi.mocked(useHistorialPagos).mockReturnValue({
      data: [pago(1, { id_inscripcion: 3, nombre_plan: "Plan Intermedio" }), pago(2, { id_inscripcion: 34 }), pago(3, { id_inscripcion: 99 })],
      isLoading: false,
      isError: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useHistorialPagos>);

    render(<HistorialCobrosAlumno alumno={ALUMNO} />);

    expect(screen.getByRole("columnheader", { name: "Plan" })).toBeInTheDocument();
    const [, ...filas] = screen.getAllByRole("row");
    expect(filas.map((fila) => within(fila).getAllByRole("cell")[2].textContent)).toEqual(["Plan Intermedio", "Plan Básico", "—"]);
  });
});
