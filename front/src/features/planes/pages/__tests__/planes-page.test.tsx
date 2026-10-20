import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlanesPage } from "../planes-page";
import type { Plan } from "@/types/plan";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock("@/components/guards/can", () => ({
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const mockPlanes: Plan[] = [
  {
    id: "1",
    nombre: "Básico",
    descripcion: null,
    tipo: "MENSUAL",
    clasesPorSemana: 2,
    diasGracia: 5,
    actividad: null,
    profesoraUnica: false,
    precioVigente: 25000,
    precioVigenteDesde: "2026-07-01T00:00:00.000Z",
    precioProgramado: null,
    fechaBaja: null,
  },
  {
    id: "2",
    nombre: "Intermedio",
    descripcion: null,
    tipo: "MENSUAL",
    clasesPorSemana: 3,
    diasGracia: 5,
    actividad: null,
    profesoraUnica: false,
    precioVigente: 30000,
    precioVigenteDesde: "2026-07-01T00:00:00.000Z",
    precioProgramado: {
      precio: 33000,
      desde: "2026-11-01T00:00:00.000Z",
    },
    fechaBaja: null,
  },
];

vi.mock("@/features/actividades/hooks/use-actividades", () => ({
  useActividades: () => ({
    data: [{ id: "1", nombre: "Kid Fit" }],
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/features/planes/hooks/use-planes", () => ({
  usePlanes: () => ({
    data: mockPlanes,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  usePreciosPlan: () => ({
    data: [
      {
        id_plan_precio: 1,
        id_plan: 2,
        precio: 30000,
        fecha_vigencia_desde: "2026-07-01T00:00:00.000Z",
        fecha_vigencia_hasta: null,
      },
    ],
    isPending: false,
    isError: false,
  }),
  useRegistrarPrecioPlan: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useActualizarPlan: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDarDeBajaPlan: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  }),
}));

const renderPlanesPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlanesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("PlanesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el encabezado, breadcrumbs y las pestañas con sus conteos", () => {
    renderPlanesPage();

    expect(screen.getByRole("heading", { name: "Planes y Precios", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Lo que se le ofrece a cada alumno, cuánto cuesta y las promociones del momento.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Planes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Promociones/i })).toBeInTheDocument();
  });

  it("muestra las tarjetas de planes con sus precios, beneficios y badges de suba programada", () => {
    renderPlanesPage();

    expect(screen.getByRole("heading", { name: "Básico" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Intermedio" })).toBeInTheDocument();
    expect(screen.getByText(/Sube el 01\/11/i)).toBeInTheDocument();
    expect(screen.getByText("2 clases por semana")).toBeInTheDocument();
    expect(screen.getByText("3 clases por semana")).toBeInTheDocument();
  });

  it("muestra el estado en construcción al seleccionar la pestaña Promociones", () => {
    renderPlanesPage();

    const btnPromociones = screen.getByRole("button", { name: /^Promociones/i });
    fireEvent.click(btnPromociones);

    expect(screen.getByText("Módulo de Promociones")).toBeInTheDocument();
    expect(screen.getByText("En construcción")).toBeInTheDocument();
    expect(screen.getByText(/Estamos desarrollando el módulo para gestionar promociones/i)).toBeInTheDocument();
  });

  it("abre el modal centrado de Cambiar precio al presionar el botón", async () => {
    renderPlanesPage();

    const botonesCambiarPrecio = screen.getAllByRole("button", { name: /Cambiar precio/i });
    fireEvent.click(botonesCambiarPrecio[0]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Precio actual")).toBeInTheDocument();
    expect(screen.getByLabelText("Nuevo arancel (ARS) *")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de vigencia *")).toBeInTheDocument();
  });

  it("abre el modal centrado de Editar plan al presionar Editar", async () => {
    renderPlanesPage();

    const botonesEditar = screen.getAllByRole("button", { name: /Editar/i });
    fireEvent.click(botonesEditar[0]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Editar plan/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clases por semana \*/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });
});
