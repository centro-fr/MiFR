import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InscripcionesPage } from "../inscripciones-page";
import { InformeAsistenciaPage } from "../informe-asistencia-page";

// Altas y bajas de ejemplo: el año pedido tiene una alta más por mes que el anterior.
function estadisticasDe(anio: number) {
  const meses = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    anio,
    nombre: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][i],
    cantidad: (i === 0 || i === 2 ? 10 : 4) + (anio - 2024),
    diferencia: null,
    variacion: null,
    bajas: i === 3 ? 5 : 2,
    activosAlCierre: 40 + i,
  }));
  return {
    anio,
    totalAltas: meses.reduce((t, m) => t + m.cantidad, 0),
    totalBajas: meses.reduce((t, m) => t + m.bajas, 0),
    activosAlInicio: 40,
    mesPico: null,
    meses,
    bajas: {
      motivos: [
        { motivo: "ABANDONO", cantidad: 9 },
        { motivo: "ECONOMICO", cantidad: 6 },
        { motivo: "MUDANZA", cantidad: 3 },
        { motivo: "SALUD", cantidad: 2 },
        { motivo: null, cantidad: 1 },
      ],
      permanencia: { cantidad: 21, promedioMeses: anio === 2025 ? 6.2 : 7.4, primerosTresMeses: 8 },
    },
  };
}

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
  useEstadisticasInscripciones: (filtros: { anio: number }) => ({
    data: estadisticasDe(filtros.anio),
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
          id: 1,
          idProfesora: 1,
          nombre: "Lucía",
          apellido: "Gómez",
          clasesDictadas: 15,
          cantidadAlumnos: 2,
          asistencias: 30,
          totalAsistencias: 30,
          porcentajePromedio: 100,
        },
      ],
      alumnos: [
        {
          id: 10,
          idAlumno: 10,
          nombre: "Juan Pérez",
          apellido: "",
          dadoDeBaja: false,
          clasesPrevistas: 8,
          asistencias: 8,
          inasistencias: 0,
          porcentaje: 100,
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

  it("renderiza la página de inscripciones con título h1, pestañas y el resumen del año", () => {
    renderizarConRuta("/app/reportes/inscripciones", <InscripcionesPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Reportes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Inscripciones" })).toBeInTheDocument();
    const resumen = screen.getByRole("region", { name: "Resumen" });
    expect(within(resumen).getByText("Crecimiento en el año")).toBeInTheDocument();
    expect(within(resumen).getByText("Activos al cierre")).toBeInTheDocument();
  });

  it("permite filtrar inscripciones por año y plan", () => {
    renderizarConRuta("/app/reportes/inscripciones", <InscripcionesPage />);

    const selectPlan = screen.getByLabelText("Plan");
    fireEvent.change(selectPlan, { target: { value: "1" } });
    expect(selectPlan).toHaveValue("1");
  });

  it("compara mes a mes con el año anterior y suma otro año al elegirlo", () => {
    renderizarConRuta("/app/reportes/inscripciones", <InscripcionesPage />);
    const seccion = screen.getByRole("region", { name: "Mes a mes, año contra año" });
    const anioActual = new Date().getFullYear();

    expect(within(seccion).getByRole("button", { name: String(anioActual - 1) })).toHaveAttribute("aria-pressed", "true");
    expect(within(seccion).getByRole("button", { name: String(anioActual - 2) })).toHaveAttribute("aria-pressed", "false");
    expect(within(seccion).getByText(/enero y marzo son los meses con más altas/)).toBeInTheDocument();

    fireEvent.click(within(seccion).getByRole("button", { name: String(anioActual - 2) }));
    fireEvent.click(within(seccion).getByRole("button", { name: "Ver tabla" }));

    expect(within(seccion).getByRole("columnheader", { name: String(anioActual - 2) })).toBeInTheDocument();
    expect(within(seccion).getByRole("columnheader", { name: `${anioActual} vs ${anioActual - 1}` })).toBeInTheDocument();
  });

  it("cambia lo que compara y resume por qué se van y cuánto se quedan", () => {
    renderizarConRuta("/app/reportes/inscripciones", <InscripcionesPage />);
    const seccion = screen.getByRole("region", { name: "Mes a mes, año contra año" });

    fireEvent.click(within(seccion).getByRole("button", { name: "Bajas" }));
    expect(within(seccion).getByText(/abril es el mes con más bajas/)).toBeInTheDocument();

    const bajas = screen.getByRole("region", { name: "Bajas del año" });
    const motivos = within(bajas).getAllByRole("listitem").map((item) => item.textContent);
    expect(motivos).toEqual([expect.stringContaining("Abandono"), expect.stringContaining("Económico"), expect.stringContaining("Mudanza"), expect.stringContaining("Otros")]);
    expect(within(bajas).getByText("7,4 meses")).toBeInTheDocument();
    expect(within(bajas).getByText("38 %")).toBeInTheDocument();
  });

  it("renderiza la página de asistencia con su período y filtros", () => {
    renderizarConRuta("/app/reportes/asistencia", <InformeAsistenciaPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Reportes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Informe de asistencia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generar informe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
  });
});
