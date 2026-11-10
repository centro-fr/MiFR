import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActividadesPage } from "../pages/actividades-page";
import type { Actividad } from "@/types/actividad";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockActividades: Actividad[] = [
  {
    id: "1",
    codigo: "FUNCIONAL",
    nombre: "Funcional Grupal",
    descripcion: "Entrenamiento funcional en grupo",
    modalidad: "GRUPAL",
    cupoMaximo: 20,
    requiereMedidas: false,
    activo: true,
  },
  {
    id: "2",
    codigo: "PILATES",
    nombre: "Pilates Reformer",
    descripcion: "Clase personalizada en camilla",
    modalidad: "PERSONALIZADA",
    cupoMaximo: 4,
    requiereMedidas: true,
    activo: true,
  },
  {
    id: "3",
    codigo: "ZUMBA",
    nombre: "Zumba Fitness",
    descripcion: "Baile aeróbico",
    modalidad: "GRUPAL",
    cupoMaximo: 25,
    requiereMedidas: false,
    activo: false,
  },
];

const mockReactivarMutate = vi.fn();

vi.mock("@/features/actividades/hooks/use-actividades", () => ({
  useActividades: () => ({
    data: mockActividades,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCrearActividad: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useActualizarActividad: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useDarDeBajaActividad: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useReactivarActividad: () => ({
    mutate: mockReactivarMutate,
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/features/horarios/api/horarios-api", () => ({
  listarHorarios: vi.fn().mockResolvedValue([]),
}));

function renderConProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActividadesPage />
    </QueryClientProvider>
  );
}

describe("ActividadesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el encabezado principal con botón de alta", () => {
    renderConProviders();
    expect(screen.getByRole("heading", { level: 1, name: /Actividades/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Nueva actividad/i })).toBeInTheDocument();
  });

  it("renderiza la barra de búsqueda y selector de modalidad", () => {
    renderConProviders();
    expect(screen.getByPlaceholderText(/Buscar por nombre o descripción/i)).toBeInTheDocument();
    expect(screen.getByText("Modalidad:")).toBeInTheDocument();
  });

  it("muestra las actividades con sus modalidades (Grupal y Personalizada)", () => {
    renderConProviders();
    expect(screen.getAllByText("Funcional Grupal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pilates Reformer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Grupal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Personalizada").length).toBeGreaterThanOrEqual(1);
  });

  it("permite filtrar por término de búsqueda", () => {
    renderConProviders();
    const input = screen.getByPlaceholderText(/Buscar por nombre o descripción/i);

    fireEvent.change(input, { target: { value: "Pilates" } });

    expect(screen.getAllByText("Pilates Reformer").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Funcional Grupal")).not.toBeInTheDocument();
  });

  it("abre el modal flotante centrado al presionar '+ Nueva actividad'", () => {
    renderConProviders();
    fireEvent.click(screen.getByRole("button", { name: /\+ Nueva actividad/i }));

    expect(screen.getByRole("heading", { name: "Nueva actividad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar actividad/i })).toBeInTheDocument();
  });

  it("abre el modal de edición al presionar 'Editar'", () => {
    renderConProviders();
    const botonesEditar = screen.getAllByRole("button", { name: /Editar/i });
    fireEvent.click(botonesEditar[0]);

    expect(screen.getByRole("heading", { name: /Editar/i })).toBeInTheDocument();
  });

  it("muestra únicamente las actividades dadas de baja en la pestaña 'Dados de baja' y permite reincorporarlas", () => {
    renderConProviders();

    expect(screen.queryByText("Zumba Fitness")).not.toBeInTheDocument();

    const pestanasBajas = screen.getAllByRole("button", { name: /Dados de baja/i });
    fireEvent.click(pestanasBajas[0]);

    expect(screen.getAllByText("Zumba Fitness").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Funcional Grupal")).not.toBeInTheDocument();

    const botonesReincorporar = screen.getAllByRole("button", { name: /Reincorporar/i });
    fireEvent.click(botonesReincorporar[0]);

    expect(mockReactivarMutate).toHaveBeenCalledWith("3", expect.any(Object));
  });
});
