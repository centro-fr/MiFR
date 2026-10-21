import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { HorariosPage } from "../HorariosPage";
import { crearHorarioFrontend } from "../../__tests__/horarios-de-prueba";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockHorario = crearHorarioFrontend({
  diaSemana: "LUNES",
  horaInicio: "08:00",
  horaFin: "09:00",
  actividadNombre: "Funcional",
  profesoraNombre: "Lucía",
});

const mockUseHorarios = vi.fn();

vi.mock("../../hooks/useHorarios", () => ({
  useHorarios: () => mockUseHorarios(),
}));

describe("HorariosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHorarios.mockReturnValue({
      cargando: false,
      errorCarga: null,
      reintentarCarga: vi.fn(),
      horarios: [mockHorario],
      totalHorarios: 1,
      actividades: [{ id: "act-1", nombre: "Funcional" }],
      profesoras: [{ id: "prof-1", nombre: "Lucía", apellido: "Gómez" }],
      filtroActividad: "TODAS",
      setFiltroActividad: vi.fn(),
      filtroProfesora: "TODAS",
      setFiltroProfesora: vi.fn(),
      crearHorario: vi.fn().mockReturnValue({ ok: true }),
      editarHorario: vi.fn().mockReturnValue({ ok: true }),
      eliminarHorario: vi.fn().mockResolvedValue({ ok: true }),
      moverHorario: vi.fn().mockReturnValue({ ok: true }),
      intercambiarHorarios: vi.fn().mockReturnValue({ ok: true }),
      validarSuperposicion: vi.fn().mockReturnValue({ ok: true }),
      hayCambiosPendientes: false,
      cantidadCambiosPendientes: 0,
      guardando: false,
      guardarCambios: vi.fn().mockResolvedValue({ ok: true, guardados: 1 }),
      cancelarCambios: vi.fn(),
    });
  });

  it("renderiza correctamente el título y subtítulo exacto", () => {
    render(
      <MemoryRouter>
        <HorariosPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Horarios" })).toBeInTheDocument();
    expect(
      screen.getByText("La semana del centro: qué clase hay, con quién y cuántos lugares quedan.")
    ).toBeInTheDocument();
  });

  it("renderiza el botón superior derecho '+ Nuevo horario'", () => {
    render(
      <MemoryRouter>
        <HorariosPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "+ Nuevo horario" })).toBeInTheDocument();
  });

  it("renderiza los selectores de filtros de Profesora y Actividad", () => {
    render(
      <MemoryRouter>
        <HorariosPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("combobox", { name: "Filtrar por profesora" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filtrar por disciplina" })).toBeInTheDocument();
  });

  it("abre el modal centrado de nuevo horario al hacer clic en '+ Nuevo horario'", () => {
    render(
      <MemoryRouter>
        <HorariosPage />
      </MemoryRouter>
    );

    const btnNuevo = screen.getByRole("button", { name: "+ Nuevo horario" });
    fireEvent.click(btnNuevo);

    expect(screen.getByRole("heading", { name: "Nuevo horario" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar formulario" })).toBeInTheDocument();
  });
});
