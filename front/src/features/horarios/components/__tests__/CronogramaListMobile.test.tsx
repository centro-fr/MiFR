import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CronogramaListMobile } from "../CronogramaListMobile";
import { crearHorarioFrontend } from "../../__tests__/horarios-de-prueba";

describe("CronogramaListMobile", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnAddForDay = vi.fn();
  const mockSetSelectedDay = vi.fn();

  const defaultProps = {
    horarios: [],
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onAddForDay: mockOnAddForDay,
    selectedDay: "LUNES" as const,
    setSelectedDay: mockSetSelectedDay,
    isFilterActive: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado vacío cuando no hay horarios para el día seleccionado", () => {
    render(<CronogramaListMobile {...defaultProps} />);
    
    expect(screen.getByText("No hay clases programadas para este día")).toBeInTheDocument();
    expect(screen.getByText("Lunes")).toBeInTheDocument();
  });

  it("renderiza correctamente una clase en la lista", () => {
    const horario = crearHorarioFrontend();
    render(<CronogramaListMobile {...defaultProps} horarios={[horario]} />);

    expect(screen.getByText("Funcional Grupal")).toBeInTheDocument();
    expect(screen.getByText("Lucía Gómez")).toBeInTheDocument();
    expect(screen.getByText("10:00 - 11:00 hs")).toBeInTheDocument();
  });

  it("permite cambiar de día seleccionado al hacer clic en una pestaña", () => {
    render(<CronogramaListMobile {...defaultProps} />);

    const tabMartes = screen.getByRole("button", { name: /Martes/i });
    fireEvent.click(tabMartes);

    expect(mockSetSelectedDay).toHaveBeenCalledWith("MARTES");
  });

  it("llama a onAddForDay al hacer clic en Nueva Clase", () => {
    render(<CronogramaListMobile {...defaultProps} />);

    const btnAsignarPrimera = screen.getByRole("button", { name: /Asignar primera clase a LUNES/i });
    fireEvent.click(btnAsignarPrimera);

    expect(mockOnAddForDay).toHaveBeenCalledWith("LUNES");
  });

  it("llama a onEdit al hacer clic en Editar", () => {
    const horario = crearHorarioFrontend();
    render(<CronogramaListMobile {...defaultProps} horarios={[horario]} />);

    const btnEditar = screen.getByRole("button", { name: /Editar/i });
    fireEvent.click(btnEditar);

    expect(mockOnEdit).toHaveBeenCalledWith(horario);
  });

  it("llama a onDelete al hacer clic en Eliminar", () => {
    const horario = crearHorarioFrontend();
    render(<CronogramaListMobile {...defaultProps} horarios={[horario]} />);

    const btnEliminar = screen.getByRole("button", { name: /Eliminar/i });
    fireEvent.click(btnEliminar);

    expect(mockOnDelete).toHaveBeenCalledWith(horario);
  });
});
