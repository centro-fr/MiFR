import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InscripcionesPage } from "../inscripciones-page";
import { InformeAsistenciaPage } from "../informe-asistencia-page";
import { RankingPage } from "../ranking-page";
import { ReporteEnConstruccionPage } from "../reporte-en-construccion-page";

// Mock de ResizeObserver para entorno jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock("@/features/reportes/hooks/use-reportes", () => ({
  usePlanesParaFiltro: () => ({
    data: [
      { id: "1", nombre: "Pase Libre" },
      { id: "2", nombre: "3 Veces por Semana" },
    ],
    isPending: false,
    isError: false,
  }),
  useProfesorasParaFiltro: () => ({
    data: [{ id: "1", nombre: "Lucía", apellido: "Gómez" }],
    isPending: false,
    isError: false,
  }),
  useActividadesParaFiltro: () => ({
    data: [{ id: "1", nombre: "Funcional" }],
    isPending: false,
    isError: false,
  }),
  useSugerenciasDeAlumnos: () => ({
    data: { items: [] },
    isPending: false,
  }),
  useEstadisticasInscripciones: () => ({
    data: {
      anio: 2026,
      totalAltas: 25,
      mesPico: { mes: 3, nombre: "Marzo", cantidad: 10 },
      meses: [
        { mes: 1, nombre: "Enero", cantidad: 5, mesAnterior: 0 },
        { mes: 2, nombre: "Febrero", cantidad: 10, mesAnterior: 5 },
        { mes: 3, nombre: "Marzo", cantidad: 10, mesAnterior: 10 },
      ],
    },
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useInformeAsistencia: () => ({
    data: {
      desde: "2026-03-01",
      hasta: "2026-03-31",
      totalAlumnos: 2,
      resumen: {
        clasesDictadas: 15,
        totalAsistencias: 30,
        promedioPorClase: 2,
      },
      porProfesora: [
        {
          idProfesora: 1,
          nombre: "Lucía",
          apellido: "Gómez",
          clasesDictadas: 15,
          totalAsistencias: 30,
        },
      ],
      alumnos: [
        {
          idAlumno: 10,
          nombre: "Juan Pérez",
          asistencias: 8,
          inasistencias: 0,
        },
      ],
    },
    isPending: false,
    isFetching: false,
    isPlaceholderData: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/features/portal-alumno/hooks/use-ranking-asistencia", () => ({
  useRankingAsistencia: () => ({
    data: {
      total: 1,
      minimo_clases: 4,
      datos: [
        {
          id_alumno: 10,
          posicion: 1,
          nombre: "Sofía",
          apellido: "Ruiz",
          clases_asistidas: 6,
          clases_previstas: 7,
          porcentaje_asistencia: 85.71,
          racha_actual: 3,
          es_propia: false,
        },
      ],
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/features/reportes/hooks/use-exportar-reporte", () => ({
  useExportarReporte: () => ({
    exportar: vi.fn(),
    preparando: false,
    impresion: null,
  }),
}));

vi.mock("@/features/reportes/hooks/use-exportar-asistencia", () => ({
  useExportarAsistencia: () => ({
    exportar: vi.fn(),
    preparando: false,
    impresion: null,
  }),
}));

function renderizarConRuta(ruta: string, elemento: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={ruta} element={elemento} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Páginas de Reportes (Estandarización)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza la página de inscripciones con título h1 y pestañas de navegación", () => {
    renderizarConRuta("/app/reportes/inscripciones", <InscripcionesPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Reportes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Inscriptos por mes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inscripciones" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Asistencia" })).toBeInTheDocument();

    // Comprueba métricas del resumen
    expect(screen.getByText("Altas en 2026")).toBeInTheDocument();
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
  });

  it("permite filtrar inscripciones por año y plan", () => {
    renderizarConRuta("/app/reportes/inscripciones", <InscripcionesPage />);

    const selectPlan = screen.getByLabelText("Plan");
    expect(selectPlan).toBeInTheDocument();
    fireEvent.change(selectPlan, { target: { value: "1" } });
    expect(selectPlan).toHaveValue("1");
  });

  it("renderiza la página de asistencia con su período y filtros", () => {
    renderizarConRuta("/app/reportes/asistencia", <InformeAsistenciaPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Reportes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Informe de asistencia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generar informe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
  });

  it("muestra el ranking de asistencia dentro de Reportes, con su pestaña marcada", () => {
    renderizarConRuta("/app/reportes/ranking", <RankingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Reportes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ranking" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Aplicar período" })).toBeInTheDocument();
    expect(screen.getByText("Sofía Ruiz")).toBeInTheDocument();
    expect(screen.getByText("1 participantes")).toBeInTheDocument();
  });

  it("renderiza un reporte en construcción con tarjeta de estado vacío moderna", () => {
    renderizarConRuta("/app/reportes/planes", <ReporteEnConstruccionPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Reportes" })).toBeInTheDocument();
    expect(screen.getByText(/en construcción/i)).toBeInTheDocument();
    expect(screen.getByText(/Este informe todavía no está disponible/i)).toBeInTheDocument();
  });
});
