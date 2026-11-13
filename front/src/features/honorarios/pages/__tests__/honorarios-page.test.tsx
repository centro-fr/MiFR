import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

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

const mockCalcular = vi.fn();
// Lo que devuelve useInformeHonorarios en cada render: cada test lo ajusta.
let mockConsulta: { data: InformeHonorarios | undefined; isPending: boolean } = { data: mockInforme, isPending: false };

vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

// El día de cierre sale de los parámetros del sistema: acá rige el valor inicial.
vi.mock("@/features/honorarios/hooks/use-dia-de-cierre", () => ({
  useDiaDeCierre: () => ({ diaDeCierre: 5, isPending: false, isError: false, error: null, refetch: vi.fn(), isFetching: false }),
}));

// El mes del informe tiene que seguir abierto para probar el botón Actualizar.
vi.mock("@/features/honorarios/utils/periodo", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/features/honorarios/utils/periodo")>();
  return { ...real, periodoActual: () => "2026-10", periodoDesdeParametro: () => "2026-10", mesSigueAbierto: () => true };
});

vi.mock("@/features/honorarios/hooks/use-honorarios", () => ({
  useInformeHonorarios: () => ({
    ...mockConsulta,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useTarifas: () => ({ data: [] }),
  useCalcularLiquidaciones: () => ({ isPending: false, mutateAsync: mockCalcular }),
  useLiquidacion: () => ({ data: undefined, isPending: true, isError: false }),
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
  const pagina = () => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/honorarios"]}>
        <HonorariosPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const resultado = render(pagina());
  return { ...resultado, volverARenderizar: () => resultado.rerender(pagina()) };
}

describe("HonorariosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsulta = { data: mockInforme, isPending: false };
    mockCalcular.mockResolvedValue({ informe: mockInforme, advertencias: [] });
  });

  it("renderiza el encabezado sin pestañas y lleva a las suplencias del mismo mes con un botón", () => {
    renderizar();

    // Encabezado principal
    expect(screen.getByRole("heading", { level: 1, name: "Honorarios" })).toBeInTheDocument();
    expect(screen.getByText(/Revisa el calculo del pago mensual para cada profesor\/a/i)).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: /Honorarios del mes/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Suplencias" })).toHaveAttribute("href", "/app/honorarios/suplencias?mes=2026-10");

    // Sin breadcrumbs locales
    expect(screen.queryByRole("navigation", { name: "Ruta de navegación" })).not.toBeInTheDocument();
  });

  it("renderiza los filtros de mes y año y el botón exportar", () => {
    renderizar();
    expect(screen.getByRole("combobox", { name: "Mes" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Año" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
  });

  it("muestra una fila por profesor/a con su estado, sin las tarjetas de resumen", () => {
    renderizar();
    expect(screen.queryByRole("region", { name: "Resumen del mes" })).not.toBeInTheDocument();
    const tabla = screen.getByRole("table");
    const fila = within(tabla).getByRole("row", { name: /Lucía Gómez/ });
    expect(within(fila).getByText("En curso")).toBeInTheDocument();
    expect(within(fila).getByRole("button", { name: "Ver el detalle de Lucía Gómez" })).toBeInTheDocument();
  });

  it("con liquidaciones no recalcula por entrar: con el mes abierto, recalcula cuando se toca Actualizar", async () => {
    renderizar();
    expect(mockCalcular).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    await vi.waitFor(() => expect(mockCalcular).toHaveBeenCalledTimes(1));
  });

  it("pasa de cargando al informe sin romperse", () => {
    mockConsulta = { data: undefined, isPending: true };
    const { volverARenderizar } = renderizar();

    mockConsulta = { data: mockInforme, isPending: false };
    volverARenderizar();

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("calcula una sola vez al entrar a un mes abierto sin liquidaciones", async () => {
    mockConsulta = { data: { ...mockInforme, totalGeneral: 0, liquidaciones: [] }, isPending: false };
    const { volverARenderizar } = renderizar();

    await vi.waitFor(() => expect(mockCalcular).toHaveBeenCalledTimes(1));
    volverARenderizar();
    volverARenderizar();
    expect(mockCalcular).toHaveBeenCalledTimes(1);
  });

  it("abre la configuración en un diálogo centrado", async () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Configuración" }));
    const dialogo = await screen.findByRole("dialog", { name: "Configuración" });
    expect(within(dialogo).getByRole("heading", { name: "Cierre del mes" })).toBeInTheDocument();
  });
});
