import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HorarioModalForm } from "../HorarioModalForm";

// Ignoramos advertencias de act() innecesarias generadas por Dialog de Radix UI en jsdom
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) return;
    originalError.call(console, ...args);
  };
});

describe("HorarioModalForm", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnValidate = vi.fn();

  // El componente requiere modelos de dominio del frontend, no de la API
  const actividades = [{
    id: "1",
    codigo: "FUNCIONAL",
    nombre: "Funcional Grupal",
    descripcion: "Entrenamiento funcional de alta intensidad",
    modalidad: "GRUPAL" as const,
    cupoMaximo: null,
    activo: true,
  }];

  const profesoras = [{
    id: "1",
    nombre: "Lucía",
    apellido: "Gómez",
  }];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    onValidate: mockOnValidate,
    actividades,
    profesoras,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza correctamente los campos básicos", () => {
    render(<HorarioModalForm {...defaultProps} />);

    // Verificamos que el título esté en pantalla
    expect(screen.getByRole("heading", { name: "Nuevo horario" })).toBeInTheDocument();
    // Verificamos que las etiquetas de los inputs existan
    expect(screen.getByText(/^Actividad/i)).toBeInTheDocument();
    expect(screen.getByText(/^Profesora/i)).toBeInTheDocument();
    expect(screen.getByText(/^Día/i)).toBeInTheDocument();
  });

  it("muestra alerta roja si falla la validación de esquema (Zod) antes de guardar", () => {
    render(<HorarioModalForm {...defaultProps} />);

    // Forzamos un error de esquema (ej: horaFin menor a horaInicio)
    const inputInicio = screen.getByLabelText(/Hora Inicio/i);
    const inputFin = screen.getByLabelText(/Hora Fin/i);

    fireEvent.change(inputInicio, { target: { value: "12:00" } });
    fireEvent.change(inputFin, { target: { value: "10:00" } });

    // Click en Aceptar
    const btnAceptar = screen.getByRole("button", { name: /Aceptar/i });
    fireEvent.click(btnAceptar);

    // Debe mostrar la alerta de "Validación de Horario" en rojo, y onSave no se debe haber llamado
    expect(screen.getByText("Validación de Horario")).toBeInTheDocument();
    expect(screen.getByText("La hora de fin debe ser posterior a la hora de inicio.")).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("muestra alerta roja si el onValidate rechaza el horario (superposición)", () => {
    // Configuramos el mock de validación para que simule superposición
    mockOnValidate.mockReturnValue({ ok: false, error: "La profesora ya está asignada a esa hora." });

    render(<HorarioModalForm {...defaultProps} />);

    const btnAceptar = screen.getByRole("button", { name: /Aceptar/i });
    fireEvent.click(btnAceptar);

    // Debe mostrar el error en pantalla
    expect(screen.getByText("Validación de Horario")).toBeInTheDocument();
    expect(screen.getByText("La profesora ya está asignada a esa hora.")).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("llama a onSave y onClose si el horario es válido", () => {
    // Las validaciones de negocio e interfaz pasan
    mockOnValidate.mockReturnValue({ ok: true });
    mockOnSave.mockReturnValue({ ok: true });

    render(<HorarioModalForm {...defaultProps} />);

    const btnAceptar = screen.getByRole("button", { name: /Aceptar/i });
    fireEvent.click(btnAceptar);

    expect(mockOnValidate).toHaveBeenCalled();
    expect(mockOnSave).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();

    // Comprobamos la información con la que se llamó onSave
    const payload = mockOnSave.mock.calls[0][0];
    expect(payload).toMatchObject({
      actividadId: "1", // El de la actividad que le pasamos por props
      profesoraId: "1", // El de la profesora por props
      diaSemana: "LUNES",
    });
  });

  it("ofrece atajos directos con links si no hay actividades o profesoras configuradas", () => {
    render(
      <MemoryRouter>
        <HorarioModalForm
          {...defaultProps}
          actividades={[]}
          profesoras={[]}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Crear actividad" })).toHaveAttribute("href", "/app/actividades");
    expect(screen.getByRole("link", { name: "Crear profesora" })).toHaveAttribute("href", "/app/profesoras");
  });
});

