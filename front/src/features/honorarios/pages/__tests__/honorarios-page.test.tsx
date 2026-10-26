import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HonorariosPage } from "../honorarios-page";
import type { InformeHonorarios } from "@/types/honorarios";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock("@/components/guards/can", () => ({
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockInforme: InformeHonorarios = {
  periodo: "2026-10",
  desde: "2026-10-01",
  hasta: "2026-10-31",
  totalGeneral: 150000,
  liquidaciones: [
    {
      id: 1,
      profesora: { id: 1, nombre: "Lucía", apellido: "Gómez" },
      montoTotal: 75000,
      desglose: {
        subtotalAlumnos: 60000,
        subtotalSuplencias: 15000,
        cantidadAlumnos: 10,
      },
      estado: "BORRADOR",
      calculadaEl: "2026-10-20T10:00:00.000Z",
    },
  ],
};

vi.mock("@/features/honorarios/hooks/use-honorarios", () => ({
  useInformeHonorarios: () => ({
    data: mockInforme,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useTarifas: () => ({ data: [] }),
  useCalcularLiquidaciones: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRegistrarTarifa: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCerrarLiquidacion: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useMarcarLiquidacionAbonada: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/features/honorarios/hooks/use-exportar-informe", () => ({
  useExportarInforme: () => ({
    exportar: vi.fn(),
    preparando: null,
    impresion: null,
  }),
}));

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/honorarios"]}>
        <HonorariosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HonorariosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el encabezado y pestañas sin breadcrumbs locales duplicados", () => {
    renderizar();

    // Encabezado principal
    expect(screen.getByRole("heading", { level: 1, name: "Honorarios" })).toBeInTheDocument();
    expect(screen.getByText(/Cuánto le corresponde a cada profesora en el mes/i)).toBeInTheDocument();

    // Pestañas
    expect(screen.getByRole("link", { name: /Honorarios del mes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Suplencias/i })).toBeInTheDocument();

    // Sin breadcrumbs locales
    expect(screen.queryByRole("navigation", { name: "Ruta de navegación" })).not.toBeInTheDocument();
  });

  it("renderiza el selector de mes y el botón exportar en el encabezado", () => {
    renderizar();
    expect(screen.getByRole("combobox", { name: /Mes del informe/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
  });

  it("renderiza el resumen del mes y la tarjeta de la profesora", () => {
    renderizar();
    expect(screen.getByRole("heading", { level: 2, name: "Total del mes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Lucía Gómez" })).toBeInTheDocument();
  });
});
