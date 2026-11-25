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
  soloMenores: false,
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

  it("renderiza únicamente los campos editables (nombre, precio y fecha de vigencia) y omite descripción, modalidad y actividad", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    expect(screen.getByRole("heading", { name: "Editar plan" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre \*/i)).toHaveValue("Kids");
    expect(screen.getByLabelText(/Precio \*/i)).toHaveValue("22.000");
    expect(screen.queryByLabelText(/Descripción/i)).not.toBeInTheDocument();

    // Modalidad de cobro y Actividad ya no son editables ni se muestran en el formulario
    expect(screen.queryByText("Abono mensual")).not.toBeInTheDocument();
    expect(screen.queryByText("Pase por clase individual")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Actividad")).not.toBeInTheDocument();

    // Otros campos eliminados
    expect(screen.queryByLabelText(/Clases por semana/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Días de gracia/i)).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Dar de baja el plan" })).not.toBeInTheDocument();
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

  it("marca el plan como solo para menores y manda solo ese cambio", async () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Solo para menores de 18 años/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockActualizarAsync).toHaveBeenCalledWith({ id: "2", cambios: { solo_menores: true } });
    });
    expect(mockRegistrarPrecioAsync).not.toHaveBeenCalled();
  });

  it("no manda la marca si solo cambia el nombre", async () => {
    render(<EditarPlanDialog plan={{ ...mockPlan, soloMenores: true }} onClose={onClose} />);
    expect(screen.getByRole("checkbox", { name: /Solo para menores de 18 años/ })).toBeChecked();

    fireEvent.change(screen.getByLabelText(/Nombre \*/i), { target: { value: "Kids Avanzado" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockActualizarAsync).toHaveBeenCalledWith({ id: "2", cambios: { nombre: "Kids Avanzado" } });
    });
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

  it("permite programar un cambio de precio con fecha de vigencia futura y muestra el aviso", async () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    const inputFecha = screen.getByLabelText(/Rige desde \*/i);
    expect(inputFecha).toBeEnabled();

    // Permite elegir la fecha incluso antes de modificar el precio
    fireEvent.change(inputFecha, { target: { value: "2099-05-01" } });
    fireEvent.change(screen.getByLabelText(/Precio \*/i), { target: { value: "26000" } });

    expect(screen.getByText(/Las cuotas ya cobradas no cambian/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockRegistrarPrecioAsync).toHaveBeenCalledWith({
        id: "2",
        cuerpo: {
          precio: 26000,
          fecha_vigencia_desde: "2099-05-01",
        },
      });
    });
  });

  it("rechaza una fecha de vigencia anterior a hoy cuando se cambia el precio", () => {
    render(<EditarPlanDialog plan={mockPlan} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/Precio \*/i), { target: { value: "26000" } });
    fireEvent.change(screen.getByLabelText(/Rige desde \*/i), { target: { value: "2020-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(mockRegistrarPrecioAsync).not.toHaveBeenCalled();
  });
});
