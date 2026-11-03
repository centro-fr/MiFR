import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MisClasesPage } from "../mis-clases-page";
import { crearHorarioFrontend } from "../../__tests__/horarios-de-prueba";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock("@/features/horarios/components/con-mi-id-de-profesora", () => ({
  ConMiIdDeProfesora: ({ children }: { children: (id: string) => ReactNode }) => (
    <div data-testid="con-mi-id">{children("prof-1")}</div>
  ),
}));

const mockHorarioLunes = crearHorarioFrontend({
  id: "horario-1",
  actividadId: "act-1",
  actividadNombre: "Funcional",
  actividadTipo: "GRUPAL",
  profesoraId: "prof-1",
  profesoraNombre: "Lucía Gómez",
  diaSemana: "LUNES",
  horaInicio: "08:00",
  horaFin: "09:00",
  cupoPropio: 15,
  cupoMaximo: 15,
});

const mockHorarioMartes = crearHorarioFrontend({
  id: "horario-2",
  actividadId: "act-2",
  actividadNombre: "Pilates",
  actividadTipo: "PERSONALIZADA",
  profesoraId: "prof-1",
  profesoraNombre: "Lucía Gómez",
  diaSemana: "MARTES",
  horaInicio: "10:00",
  horaFin: "11:00",
  cupoPropio: 4,
  cupoMaximo: 4,
});

const mockUseCronogramaProfesor = vi.fn();

vi.mock("../../hooks/use-cronograma-profesor", () => ({
  DIAS_SEMANA_CRONOGRAMA: [
    { id: "LUNES", label: "Lunes", shortLabel: "Lun" },
    { id: "MARTES", label: "Martes", shortLabel: "Mar" },
    { id: "MIERCOLES", label: "Miércoles", shortLabel: "Mié" },
    { id: "JUEVES", label: "Jueves", shortLabel: "Jue" },
    { id: "VIERNES", label: "Viernes", shortLabel: "Vie" },
  ],
  useCronogramaProfesor: (id: string | null) => mockUseCronogramaProfesor(id),
}));

describe("MisClasesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCronogramaProfesor.mockReturnValue({
      horarios: [mockHorarioLunes, mockHorarioMartes],
      horariosPorDia: {
        LUNES: [mockHorarioLunes],
        MARTES: [mockHorarioMartes],
        MIERCOLES: [],
        JUEVES: [],
        VIERNES: [],
        SABADO: [],
        DOMINGO: [],
      },
      metricas: {
        totalClases: 2,
        totalHoras: 2,
        actividadesDistintas: 2,
        nombresActividades: ["Funcional", "Pilates"],
        totalCupoMaximo: 19,
      },
      cargando: false,
      error: null,
      reintentar: vi.fn(),
    });
  });

  it("renderiza correctamente el encabezado principal y el botón de acción", () => {
    render(
      <MemoryRouter>
        <MisClasesPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mis Clases", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText("Tu cronograma semanal de actividades y horarios asignados."),
    ).toBeInTheDocument();

    // Botón de acción hacia las clases del día
    expect(screen.getByRole("link", { name: /Tomar asistencia hoy/i })).toBeInTheDocument();

    // Métricas removidas por diseño
    expect(screen.queryByText("Clases semanales")).not.toBeInTheDocument();
    expect(screen.queryByText("Carga horaria")).not.toBeInTheDocument();

    // Días de lunes a viernes en las pestañas
    expect(screen.getByRole("button", { name: /Lunes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Viernes/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sábado/i })).not.toBeInTheDocument();
  });

  it("muestra las clases en la grilla y abre el modal al tocar una clase", () => {
    render(
      <MemoryRouter>
        <MisClasesPage />
      </MemoryRouter>,
    );

    // Encontramos el botón de la clase Funcional
    const botonesFuncional = screen.getAllByRole("button", { name: /Funcional/i });
    expect(botonesFuncional.length).toBeGreaterThan(0);

    // Abrir modal de detalle
    fireEvent.click(botonesFuncional[0]);

    // El modal muestra la información completa
    expect(screen.getByRole("heading", { name: "Funcional", level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/08:00 a 09:00 hs/i)).toBeInTheDocument();
    expect(screen.getByText(/15 personas/i)).toBeInTheDocument();
    expect(screen.getByText("Lucía Gómez")).toBeInTheDocument();

    // Cerrar modal
    const botonCerrar = screen.getByRole("button", { name: "Cerrar" });
    fireEvent.click(botonCerrar);
  });

  it("muestra el estado de carga cuando está pendiente", () => {
    mockUseCronogramaProfesor.mockReturnValue({
      horarios: [],
      horariosPorDia: { LUNES: [], MARTES: [], MIERCOLES: [], JUEVES: [], VIERNES: [], SABADO: [], DOMINGO: [] },
      metricas: { totalClases: 0, totalHoras: 0, actividadesDistintas: 0, nombresActividades: [], totalCupoMaximo: 0 },
      cargando: true,
      error: null,
      reintentar: vi.fn(),
    });

    render(
      <MemoryRouter>
        <MisClasesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Cargando tu cronograma semanal/i)).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no tiene clases asignadas", () => {
    mockUseCronogramaProfesor.mockReturnValue({
      horarios: [],
      horariosPorDia: { LUNES: [], MARTES: [], MIERCOLES: [], JUEVES: [], VIERNES: [], SABADO: [], DOMINGO: [] },
      metricas: { totalClases: 0, totalHoras: 0, actividadesDistintas: 0, nombresActividades: [], totalCupoMaximo: 0 },
      cargando: false,
      error: null,
      reintentar: vi.fn(),
    });

    render(
      <MemoryRouter>
        <MisClasesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /No tenés clases asignadas en el cronograma/i }),
    ).toBeInTheDocument();
  });

  it("muestra el estado de error y botón de reintentar", () => {
    const mockReintentar = vi.fn();
    mockUseCronogramaProfesor.mockReturnValue({
      horarios: [],
      horariosPorDia: { LUNES: [], MARTES: [], MIERCOLES: [], JUEVES: [], VIERNES: [], SABADO: [], DOMINGO: [] },
      metricas: { totalClases: 0, totalHoras: 0, actividadesDistintas: 0, nombresActividades: [], totalCupoMaximo: 0 },
      cargando: false,
      error: new Error("Fallo de red"),
      reintentar: mockReintentar,
    });

    render(
      <MemoryRouter>
        <MisClasesPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    const botonReintentar = screen.getByRole("button", { name: /Reintentar/i });
    fireEvent.click(botonReintentar);
    expect(mockReintentar).toHaveBeenCalled();
  });
});
