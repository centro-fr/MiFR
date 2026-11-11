import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarActividadesPublicas } from "@/features/publico/api/actividades-api";
import { Actividades } from "../actividades";

vi.mock("@/features/publico/api/actividades-api", () => ({ consultarActividadesPublicas: vi.fn() }));

const consultar = vi.mocked(consultarActividadesPublicas);

function renderActividades() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Actividades />
    </QueryClientProvider>,
  );
}

describe("Actividades", () => {
  beforeEach(() => {
    consultar.mockReset();
  });

  it("muestra la carga mientras llegan las actividades", () => {
    consultar.mockReturnValue(new Promise(() => {}));

    renderActividades();

    expect(screen.getByRole("status", { name: "Cargando las actividades" })).toBeInTheDocument();
  });

  it("muestra cada actividad con sus días, resumidos si son seguidos", async () => {
    consultar.mockResolvedValue({
      actividades: [
        {
          id_actividad: 1,
          nombre: "Funcional",
          descripcion: "Entrenamiento funcional en grupo",
          modalidad: "GRUPAL",
          dias: [1, 2, 3, 4, 5],
          clases_por_semana: 5,
        },
        { id_actividad: 2, nombre: "Combat", descripcion: null, modalidad: "GRUPAL", dias: [2, 4], clases_por_semana: 2 },
      ],
    });

    renderActividades();

    const lista = await screen.findByRole("list");
    const [funcional, combat] = within(lista).getAllByRole("listitem");
    expect(within(funcional).getByRole("heading", { name: "Funcional" })).toBeInTheDocument();
    expect(funcional).toHaveTextContent("Lun a Vie");
    expect(funcional).toHaveTextContent("Días: lunes, martes, miércoles, jueves y viernes");
    expect(combat).toHaveTextContent("Mar · Jue");
    expect(combat).toHaveTextContent("Días: martes y jueves");
  });

  it("no aparece si no hay actividades o si la consulta falla", async () => {
    consultar.mockResolvedValueOnce({ actividades: [] });
    const { container, unmount } = renderActividades();
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
    unmount();

    consultar.mockRejectedValueOnce(new Error("sin red"));
    const fallida = renderActividades();
    await vi.waitFor(() => expect(fallida.container).toBeEmptyDOMElement());
  });
});
