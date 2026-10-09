import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CronogramaGridDesktop } from "../CronogramaGridDesktop";
import { crearHorarioFrontend } from "../../__tests__/horarios-de-prueba";

describe("CronogramaGridDesktop", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnAddForCell = vi.fn();
  const mockOnMoveHorario = vi.fn();
  const mockOnSwapHorarios = vi.fn();

  const defaultProps = {
    horarios: [],
    todosLosHorarios: [],
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onAddForCell: mockOnAddForCell,
    onMoveHorario: mockOnMoveHorario,
    onSwapHorarios: mockOnSwapHorarios,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el mensaje de estado vacío cuando no hay horarios", () => {
    render(<CronogramaGridDesktop {...defaultProps} />);
    expect(screen.getByText("Cronograma sin franjas horarias")).toBeInTheDocument();
  });

  it("renderiza correctamente los datos de un horario en la grilla", () => {
    const horario = crearHorarioFrontend({ diaSemana: "MIERCOLES", horaInicio: "15:00", horaFin: "16:00" });
    render(<CronogramaGridDesktop {...defaultProps} horarios={[horario]} todosLosHorarios={[horario]} />);

    expect(screen.getByText("Funcional Grupal")).toBeInTheDocument();
    expect(screen.getByText("Lucía Gómez")).toBeInTheDocument();
    expect(screen.getByText("15:00 - 16:00")).toBeInTheDocument();
  });

  it("permite hacer clic en Editar e invoca la función con el horario correspondiente", () => {
    const horario = crearHorarioFrontend({ diaSemana: "MIERCOLES", horaInicio: "15:00", horaFin: "16:00" });
    render(<CronogramaGridDesktop {...defaultProps} horarios={[horario]} todosLosHorarios={[horario]} />);

    const botonEditar = screen.getByRole("button", { name: /Editar horario/i });
    fireEvent.click(botonEditar);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(horario);
  });

  it("permite hacer clic en Eliminar e invoca la función con el horario correspondiente", () => {
    const horario = crearHorarioFrontend({ diaSemana: "MIERCOLES", horaInicio: "15:00", horaFin: "16:00" });
    render(<CronogramaGridDesktop {...defaultProps} horarios={[horario]} todosLosHorarios={[horario]} />);

    const botonEliminar = screen.getByRole("button", { name: /Eliminar horario/i });
    fireEvent.click(botonEliminar);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(horario);
  });

  it("deja editar y eliminar al alcance del teclado, con el contexto de la clase en el nombre accesible", () => {
    const horario = crearHorarioFrontend({ diaSemana: "MIERCOLES", horaInicio: "15:00", horaFin: "16:00" });
    render(<CronogramaGridDesktop {...defaultProps} horarios={[horario]} todosLosHorarios={[horario]} />);

    const botonEditar = screen.getByRole("button", { name: "Editar horario de Funcional Grupal, MIERCOLES 15:00" });
    const botonEliminar = screen.getByRole("button", { name: "Eliminar horario de Funcional Grupal, MIERCOLES 15:00" });

    // Si estuvieran ocultos con display:none no entrarían en el orden de tab.
    expect(botonEditar.tabIndex).toBeGreaterThanOrEqual(0);
    expect(botonEliminar.tabIndex).toBeGreaterThanOrEqual(0);
    expect(botonEditar.parentElement).toHaveClass("sr-only", "group-focus-within:not-sr-only");
  });
});
