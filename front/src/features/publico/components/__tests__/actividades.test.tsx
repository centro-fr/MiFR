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

  it("muestra cada actividad con su descripción, sus días y sus clases por semana", async () => {
    consultar.mockResolvedValue({
      actividades: [
        {
          id_actividad: 1,
          nombre: "Funcional",
          descripcion: "Entrenamiento funcional en grupo",
          modalidad: "GRUPAL",
          dias: [1, 3, 5],
          clases_por_semana: 3,
        },
        { id_actividad: 2, nombre: "Combat", descripcion: null, modalidad: "GRUPAL", dias: [2], clases_por_semana: 1 },
      ],
    });

    renderActividades();

    const lista = await screen.findByRole("list");
    const [funcional, combat] = within(lista).getAllByRole("listitem");
    expect(funcional).toHaveTextContent("Funcional");
    expect(funcional).toHaveTextContent("Entrenamiento funcional en grupo");
    expect(funcional).toHaveTextContent("Días: lunes, miércoles y viernes");
    expect(funcional).toHaveTextContent("3 clases por semana");
    expect(combat).toHaveTextContent("1 clase por semana");
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
