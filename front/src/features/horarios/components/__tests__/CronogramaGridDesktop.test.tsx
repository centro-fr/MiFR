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

  it("distribuye 2 clases contiguas que comparten franja horaria (ej: 10:00 a 11:30 y 11:30 a 13:00) mitad arriba y mitad abajo a ancho completo", () => {
    const horario1 = crearHorarioFrontend({
      id: "1",
      diaSemana: "LUNES",
      horaInicio: "10:00",
      horaFin: "11:30",
      actividadNombre: "Funcional Grupal",
      profesoraNombre: "Lucía Gómez",
    });
    const horario2 = crearHorarioFrontend({
      id: "2",
      diaSemana: "LUNES",
      horaInicio: "11:30",
      horaFin: "13:00",
      actividadNombre: "Entrenamiento Personalizado",
      profesoraNombre: "Carla Ruiz",
    });

    render(<CronogramaGridDesktop {...defaultProps} horarios={[horario1, horario2]} todosLosHorarios={[horario1, horario2]} />);

    expect(screen.getByText("Funcional Grupal")).toBeInTheDocument();
    expect(screen.getByText("Entrenamiento Personalizado")).toBeInTheDocument();

    const contenedor1 = screen.getByText("Funcional Grupal").closest("div[style*='position: absolute']");
    const contenedor2 = screen.getByText("Entrenamiento Personalizado").closest("div[style*='position: absolute']");

    expect(contenedor1).toHaveStyle({ left: "3px", right: "3px" });
    expect(contenedor2).toHaveStyle({ left: "3px", right: "3px" });

    // La primera clase empieza a las 10:00 (top base) y dura 90 min (156px)
    // La segunda clase empieza a las 11:30 (top 156px + 2px = 158px) ocupando la mitad inferior de la casilla de las 11
    expect(contenedor1).toHaveStyle({ top: "2px", height: "152px" });
    expect(contenedor2).toHaveStyle({ top: "158px", height: "152px" });
  });

  it("renderiza clases nocturnas hasta las 23:00 y expande las franjas horarias", () => {
    const horarioNocturno = crearHorarioFrontend({
      diaSemana: "VIERNES",
      horaInicio: "22:00",
      horaFin: "23:00",
    });

    render(<CronogramaGridDesktop {...defaultProps} horarios={[horarioNocturno]} todosLosHorarios={[horarioNocturno]} />);

    expect(screen.getByText("22:00 - 23:00")).toBeInTheDocument();
  });
});
