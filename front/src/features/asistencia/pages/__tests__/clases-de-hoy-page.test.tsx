import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClasesDeHoyPage } from "../asistencia-page";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockClases: ClaseDelDiaApi[] = [
  {
    id_clase: 101,
    id_horario: 1,
    fecha_clase: "2026-10-14T10:00:00.000Z",
    id_prof_dictante: 2,
    estado: "PROGRAMADA",
    fecha_cierre_asist: null,
    observaciones: null,
    inscriptos: 8,
    cupo_disponible: 2,
    horario: {
      hora_inicio: "2026-10-14T09:00:00.000Z",
      hora_fin: "2026-10-14T10:00:00.000Z",
      cupo_maximo: 10,
      actividad: {
        id_actividad: 1,
        nombre: "Funcional Matutino",
        modalidad: "GRUPAL",
        cupo_maximo: 10,
      },
    },
  },
  {
    id_clase: 102,
    id_horario: 2,
    fecha_clase: "2026-10-14T15:00:00.000Z",
    id_prof_dictante: 2,
    estado: "DICTADA",
    fecha_cierre_asist: "2026-10-14T16:05:00.000Z",
    observaciones: null,
    inscriptos: 4,
    cupo_disponible: 0,
    horario: {
      hora_inicio: "2026-10-14T15:00:00.000Z",
      hora_fin: "2026-10-14T16:00:00.000Z",
      cupo_maximo: 4,
      actividad: {
        id_actividad: 2,
        nombre: "Pilates Reformer",
        modalidad: "PERSONALIZADA",
        cupo_maximo: 4,
      },
    },
  },
];

let clasesMock: ClaseDelDiaApi[] = mockClases;
let isPendingMock = false;
let isErrorMock = false;
const refetchMock = vi.fn();

vi.mock("@/features/asistencia/hooks/use-asistencia", () => ({
  useClasesAsistencia: () => ({
    data: clasesMock,
    isPending: isPendingMock,
    isError: isErrorMock,
    error: isErrorMock ? new Error("Error al conectar con el servidor") : null,
    refetch: refetchMock,
  }),
  useAsistenciaDeClase: () => ({ data: undefined, isPending: false, isError: false }),
  useMarcarAsistencia: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMarcarTodosPresentes: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCerrarAsistencia: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: 2, roles: ["PROPIETARIA", "PROFESORA"], nombre: "Carla", apellido: "Gómez" },
  }),
}));

vi.mock("@/features/horarios/api/horarios-api", () => ({
  listarProfesoras: vi.fn().mockResolvedValue([
    { id: "2", nombre: "Carla", apellido: "Gómez" },
    { id: "99", nombre: "Lucía", apellido: "Pérez" },
  ]),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const crearQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderClasesDeHoyPage = () => {
  const queryClient = crearQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClasesDeHoyPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("ClasesDeHoyPage (Rol Profesora)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clasesMock = mockClases;
    isPendingMock = false;
    isErrorMock = false;
  });

  it("renderiza el encabezado estándar con título Hoy y la píldora de conteo", () => {
    renderClasesDeHoyPage();

    // Título h1 con 'Hoy'
    const titulo = screen.getByRole("heading", { level: 1, name: "Hoy" });
    expect(titulo).toBeInTheDocument();

    // Badge de conteo con 2 clases
    expect(screen.getByText("2 clases")).toBeInTheDocument();

    // Subtítulo descriptivo
    expect(screen.getByText(/Clases del día y toma de asistencia para hoy/i)).toBeInTheDocument();
  });

  it("no renderiza el panel de KPIs en la vista de profesora, manteniendo la pantalla directa y limpia", () => {
    renderClasesDeHoyPage();

    // La profesora va directo a las clases del día sin tarjetas de KPIs innecesarias
    expect(screen.queryByRole("region", { name: "Resumen de clases" })).not.toBeInTheDocument();
  });

  it("muestra las clases programadas con horario, actividad y estado", () => {
    renderClasesDeHoyPage();

    // Nombres de actividades
    expect(screen.getAllByText("Funcional Matutino").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pilates Reformer").length).toBeGreaterThan(0);

    // Modalidades
    expect(screen.getAllByText("Grupal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Personalizada").length).toBeGreaterThan(0);

    // Botones de acción hacia asistencia
    expect(screen.getAllByText(/asistencia/i).length).toBeGreaterThan(0);
  });

  it("filtra clases al buscar por nombre de actividad", () => {
    renderClasesDeHoyPage();

    const buscador = screen.getByPlaceholderText(/Buscar por actividad/i);
    fireEvent.change(buscador, { target: { value: "Pilates" } });

    // Pilates Reformer debe seguir visible
    expect(screen.getAllByText("Pilates Reformer").length).toBeGreaterThan(0);

    // Funcional Matutino debe haber sido filtrado
    expect(screen.queryByText("Funcional Matutino")).not.toBeInTheDocument();
  });

  it("filtra clases por chip de estado (ej: Cerradas)", () => {
    renderClasesDeHoyPage();

    const botonCerradas = screen.getByRole("button", { name: "Cerradas" });
    fireEvent.click(botonCerradas);

    // Solo debe mostrar Pilates Reformer (DICTADA / Cerrada)
    expect(screen.getAllByText("Pilates Reformer").length).toBeGreaterThan(0);
    expect(screen.queryByText("Funcional Matutino")).not.toBeInTheDocument();

    // Debe mostrar el botón de limpiar filtros
    const botonLimpiar = screen.getByRole("button", { name: /Limpiar/i });
    expect(botonLimpiar).toBeInTheDocument();

    // Al hacer click en limpiar, vuelven a aparecer todas
    fireEvent.click(botonLimpiar);
    expect(screen.getAllByText("Funcional Matutino").length).toBeGreaterThan(0);
  });

  it("muestra el mensaje de vacío cuando no hay clases coincidentes con la búsqueda", () => {
    renderClasesDeHoyPage();

    const buscador = screen.getByPlaceholderText(/Buscar por actividad/i);
    fireEvent.change(buscador, { target: { value: "Zumba Inexistente" } });

    expect(screen.getByText("No se encontraron clases")).toBeInTheDocument();
  });

  it("muestra el mensaje de vacío cuando no hay clases para hoy", () => {
    clasesMock = [];
    renderClasesDeHoyPage();

    expect(screen.getByText("No hay clases para esta fecha")).toBeInTheDocument();
    expect(screen.getByText(/Cuando tengas una clase asignada para hoy, va a aparecer acá/i)).toBeInTheDocument();
  });

  it("muestra el spinner de carga cuando isPending es true", () => {
    isPendingMock = true;
    renderClasesDeHoyPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Cargando clases…/i)).toBeInTheDocument();
  });

  it("muestra el estado de error y permite reintentar", () => {
    isErrorMock = true;
    renderClasesDeHoyPage();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    const botonReintentar = screen.getByRole("button", { name: /Reintentar/i });
    expect(botonReintentar).toBeInTheDocument();

    fireEvent.click(botonReintentar);
    expect(refetchMock).toHaveBeenCalled();
  });

  it("filtra clases de otras profesoras cuando la usuaria tiene rol Propietaria y Profesora", async () => {
    // mockClases tiene clases dictadas por Carla Gómez (id_prof_dictante: 2)
    // Agregamos una clase de otra profesora (id_prof_dictante: 99)
    clasesMock = [
      ...mockClases,
      {
        id_clase: 999,
        id_horario: 99,
        fecha_clase: "2026-10-14T18:00:00.000Z",
        id_prof_dictante: 99,
        estado: "PROGRAMADA",
        fecha_cierre_asist: null,
        observaciones: null,
        inscriptos: 5,
        cupo_disponible: 5,
        horario: {
          hora_inicio: "2026-10-14T18:00:00.000Z",
          hora_fin: "2026-10-14T19:00:00.000Z",
          cupo_maximo: 10,
          actividad: {
            id_actividad: 99,
            nombre: "Spinning de Otra Profesora",
            modalidad: "GRUPAL",
            cupo_maximo: 10,
          },
        },
      },
    ];

    renderClasesDeHoyPage();

    // Solo deben figurar las clases de Carla Gómez
    await waitFor(() => {
      expect(screen.queryByText("Spinning de Otra Profesora")).not.toBeInTheDocument();
    });
    expect(screen.getByText("2 clases")).toBeInTheDocument();
  });
});
