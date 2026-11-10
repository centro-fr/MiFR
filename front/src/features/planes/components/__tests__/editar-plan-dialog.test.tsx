import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
const mockActualizarAsync = vi.fn();
const mockRegistrarPrecioAsync = vi.fn();

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
    mutateAsync: mockActualizarAsync,
    isPending: false,
  }),
  useRegistrarPrecioPlan: () => ({
    mutateAsync: mockRegistrarPrecioAsync,
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
    mockActualizarAsync.mockResolvedValue({ ...mockPlan, nombre: "Kids Avanzado" });
    mockRegistrarPrecioAsync.mockResolvedValue({ id_plan_precio: 99, precio: 26000 });
  });

  it("renderiza campos simplificados con los valores del plan Kids y sin cantidad de días", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    expect(screen.getByRole("heading", { name: "Editar plan Kids" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre \*/i)).toHaveValue("Kids");
    expect(screen.getByText("Abono mensual")).toBeInTheDocument();
    expect(screen.getByText("Pase por clase individual")).toBeInTheDocument();

    // Textos de ayuda y campos de cantidad de días eliminados
    expect(screen.queryByText(/La modalidad de cobro no se puede modificar/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Clases por semana/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Días de gracia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Días que el alumno puede seguir viniendo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Si elegís una, al inscribir/i)).not.toBeInTheDocument();

    // Actividad y campo Precio
    expect(screen.getByLabelText("Actividad")).toBeInTheDocument();
    expect(screen.getByLabelText(/Precio \*/i)).toHaveValue("22.000");

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
    expect(mockActualizarAsync).not.toHaveBeenCalled();
    expect(mockRegistrarPrecioAsync).not.toHaveBeenCalled();
  });

  it("abre el modal de baja al presionar 'Dar de baja el plan'", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Dar de baja el plan" }));

    expect(screen.getByText(/¿Dar de baja "Kids"\?/i)).toBeInTheDocument();
  });

  it("envía las modificaciones de nombre al hacer clic en Guardar cambios", async () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    const inputNombre = screen.getByLabelText(/Nombre \*/i);
    fireEvent.change(inputNombre, { target: { value: "Kids Avanzado" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockActualizarAsync).toHaveBeenCalledTimes(1);
      expect(mockActualizarAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "2",
          cambios: expect.objectContaining({
            nombre: "Kids Avanzado",
          }),
        })
      );
    });
    expect(mockRegistrarPrecioAsync).not.toHaveBeenCalled();
  });

  it("permite modificar el precio y actualiza el historial registrando el nuevo precio", async () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    const inputPrecio = screen.getByLabelText(/Precio \*/i);
    fireEvent.change(inputPrecio, { target: { value: "26000" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockRegistrarPrecioAsync).toHaveBeenCalledTimes(1);
      expect(mockRegistrarPrecioAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "2",
          cuerpo: expect.objectContaining({
            precio: 26000,
          }),
        })
      );
    });
    expect(mockActualizarAsync).not.toHaveBeenCalled();
  });
});
