import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActividadesPublicas } from "@/features/publico/hooks/use-actividades-publicas";
import { DisponibilidadPage } from "../disponibilidad-page";

vi.mock("@/features/publico/hooks/use-actividades-publicas", () => ({ useActividadesPublicas: vi.fn() }));

const consultar = vi.mocked(useActividadesPublicas);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DisponibilidadPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DisponibilidadPage", () => {
  beforeEach(() => {
    consultar.mockReset();
    consultar.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActividadesPublicas>);
  });

  it("muestra la disponibilidad pública sin requerir sesión", async () => {
    consultar.mockReturnValue({
      data: {
        actividades: [
          {
            id_actividad: 1,
            nombre: "Training",
            descripcion: "Entrenamiento funcional",
            modalidad: "GRUPAL",
            dias: [1, 3, 5],
            clases_por_semana: 3,
          },
        ],
      },
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActividadesPublicas>);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Disponibilidad y horarios" })).toBeInTheDocument();
    expect(await screen.findByText("Training")).toBeInTheDocument();
    expect(screen.getByText("Lun · Mié · Vie")).toBeInTheDocument();
  });

  it("muestra estado vacío cuando no hay actividades", async () => {
    consultar.mockReturnValue({
      data: { actividades: [] },
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActividadesPublicas>);

    renderPage();

    expect(await screen.findByRole("heading", { name: "No hay actividades disponibles" })).toBeInTheDocument();
  });

  it("muestra error y permite reintentar", async () => {
    consultar.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useActividadesPublicas>);

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("Revisá tu conexión");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
