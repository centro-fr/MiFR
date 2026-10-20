import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EditarPlanDialog } from "../editar-plan-dialog";
import type { Plan } from "@/types/plan";

const mockPlan: Plan = {
  id: "2",
  nombre: "Kids",
  descripcion: "Para chicos de 6 a 12 años",
  tipo: "MENSUAL",
  clasesPorSemana: 2,
  diasGracia: 5,
  actividad: { id: "10", nombre: "Kid Fit", modalidad: "GRUPAL" },
  profesoraUnica: true,
  precioVigente: 22000,
  precioVigenteDesde: "2026-07-01T00:00:00.000Z",
  precioProgramado: null,
  fechaBaja: null,
};

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/features/actividades/hooks/use-actividades", () => ({
  useActividades: () => ({
    data: [{ id: "10", nombre: "Kid Fit" }, { id: "11", nombre: "Funcional" }],
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/features/planes/hooks/use-planes", () => ({
  usePlanes: () => ({
    data: [mockPlan],
    isPending: false,
    isError: false,
  }),
  useActualizarPlan: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useDarDeBajaPlan: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    reset: vi.fn(),
  }),
}));

describe("EditarPlanDialog", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza todos los campos con los valores del plan Kids", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    expect(screen.getByRole("heading", { name: "Editar plan Kids" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre \*/i)).toHaveValue("Kids");
    expect(screen.getByText("Mensual")).toBeInTheDocument();
    expect(screen.getByText("Suelta")).toBeInTheDocument();
    expect(screen.getByText(/El tipo no se puede cambiar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clases por semana \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Días de gracia")).toHaveValue(5);
    expect(screen.getByLabelText("Actividad")).toBeInTheDocument();
    expect(screen.getByText("Solo con la profesora a cargo")).toBeInTheDocument();
    expect(screen.getByLabelText(/Descripción \(opcional\)/i)).toHaveValue("Para chicos de 6 a 12 años");
    expect(screen.getByRole("button", { name: "Dar de baja el plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("permite cerrar el modal con el botón Cancelar", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("permite cerrar el modal con el botón de la cruz X", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar formulario" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("muestra error si se borra el nombre y se intenta guardar", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    const inputNombre = screen.getByLabelText(/Nombre \*/i);
    fireEvent.change(inputNombre, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByText("Ingresá el nombre del plan.")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("abre el modal de baja al presionar 'Dar de baja el plan'", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Dar de baja el plan" }));

    expect(screen.getByText(/¿Dar de baja "Kids"\?/i)).toBeInTheDocument();
  });

  it("envía las modificaciones al hacer clic en Guardar cambios", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    const inputNombre = screen.getByLabelText(/Nombre \*/i);
    fireEvent.change(inputNombre, { target: { value: "Kids Avanzado" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "2",
        cambios: expect.objectContaining({
          nombre: "Kids Avanzado",
        }),
      }),
      expect.any(Object)
    );
  });
});
