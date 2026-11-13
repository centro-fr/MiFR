import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CrearPlanDialog } from "../crear-plan-dialog";

const mockMutate = vi.fn();

vi.mock("@/features/actividades/hooks/use-actividades", () => ({
  useActividades: () => ({
    data: [
      { id: "1", nombre: "Funcional", modalidad: "GRUPAL", activo: true },
      { id: "2", nombre: "Pilates Personalizado", modalidad: "PERSONALIZADA", activo: true },
    ],
  }),
}));

vi.mock("@/features/planes/hooks/use-planes", () => ({
  usePlanes: () => ({
    data: [
      { id: "1", nombre: "Plan Existente", fechaBaja: null },
    ],
  }),
  useCrearPlan: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe("CrearPlanDialog", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza correctamente los campos iniciales del modal", () => {
    render(<CrearPlanDialog abierto={true} onClose={onClose} />);

    expect(screen.getByRole("heading", { name: "Nuevo plan" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre \*/i)).toHaveValue("");
    expect(screen.getByText("Modalidad de cobro")).toBeInTheDocument();
    expect(screen.getByText("Abono mensual")).toBeInTheDocument();
    expect(screen.getByText("Pase por clase individual")).toBeInTheDocument();
    expect(screen.getByLabelText(/Clases por semana \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Días de gracia \*/i)).toHaveValue(5);
    expect(screen.getByLabelText("Actividad")).toBeInTheDocument();
    expect(screen.getByLabelText(/Precio inicial \*/i)).toHaveValue("");
    expect(screen.getByLabelText(/Descripción \(opcional\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear plan" })).toBeInTheDocument();
  });

  it("permite cerrar el modal con Cancelar o el botón X", () => {
    render(<CrearPlanDialog abierto={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar formulario" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("bloquea el envío si se ingresa un nombre repetido", () => {
    render(<CrearPlanDialog abierto={true} onClose={onClose} />);

    const inputNombre = screen.getByLabelText(/Nombre \*/i);
    fireEvent.change(inputNombre, { target: { value: "Plan Existente" } });

    const inputPrecio = screen.getByLabelText(/Precio inicial \*/i);
    fireEvent.change(inputPrecio, { target: { value: "30000" } });

    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }));

    expect(screen.getByText(/Ya existe un plan vigente llamado "Plan Existente"./i)).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("muestra error si el precio está vacío o es cero", () => {
    render(<CrearPlanDialog abierto={true} onClose={onClose} />);

    const inputNombre = screen.getByLabelText(/Nombre \*/i);
    fireEvent.change(inputNombre, { target: { value: "Plan Nuevo" } });

    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }));

    expect(screen.getByText("Ingresá un precio mayor a $0.")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("envía la creación exitosa con los datos válidos", () => {
    render(<CrearPlanDialog abierto={true} onClose={onClose} />);

    const inputNombre = screen.getByLabelText(/Nombre \*/i);
    fireEvent.change(inputNombre, { target: { value: "Plan Intermedio" } });

    const inputPrecio = screen.getByLabelText(/Precio inicial \*/i);
    fireEvent.change(inputPrecio, { target: { value: "38500" } });

    fireEvent.click(screen.getByRole("button", { name: "Crear plan" }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Plan Intermedio",
        tipo: "MENSUAL",
        precio: 38500,
        dias_gracia: 5,
        clases_por_semana: 2,
      }),
      expect.any(Object)
    );
  });
});
