import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarDisponibilidad } from "@/features/publico/api/disponibilidad-api";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { TableroHorarios } from "../tablero-horarios";

vi.mock("@/features/publico/api/disponibilidad-api", () => ({ consultarDisponibilidad: vi.fn() }));

const consultar = vi.mocked(consultarDisponibilidad);

function horario(cambios: Partial<HorarioPublico> = {}): HorarioPublico {
  return {
    id_horario: 1,
    dia_semana: 2,
    hora_inicio: "1970-01-01T09:00:00.000Z",
    hora_fin: "1970-01-01T10:00:00.000Z",
    actividad: { id_actividad: 2, nombre: "Entrenamiento Personalizado", descripcion: null, modalidad: "PERSONALIZADA" },
    profesora: { nombre: "Carla", apellido: "Ruiz" },
    cupo_maximo: 4,
    cupo_disponible: 2,
    disponibilidad: "LIBRE",
    ...cambios,
  };
}

function renderTablero() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TableroHorarios />
    </QueryClientProvider>,
  );
}

describe("TableroHorarios", () => {
  beforeEach(() => {
    consultar.mockReset();
  });

  it("muestra la carga mientras llegan los horarios", () => {
    consultar.mockReturnValue(new Promise(() => {}));

    renderTablero();

    expect(screen.getByRole("status", { name: "Cargando los horarios" })).toBeInTheDocument();
  });

  it("muestra cada clase con su horario, su profesora y los lugares libres", async () => {
    consultar.mockResolvedValue({
      horarios: [
        horario(),
        horario({ id_horario: 2, cupo_disponible: 1, disponibilidad: "CASI_LLENO" }),
        horario({ id_horario: 3, cupo_disponible: 0, disponibilidad: "COMPLETO" }),
      ],
    });

    renderTablero();

    const martes = await screen.findByRole("region", { name: "Martes" });
    expect(martes).toHaveTextContent("09:00 – 10:00");
    expect(martes).toHaveTextContent("Carla Ruiz");
    expect(martes).toHaveTextContent("2 lugares libres");
    expect(martes).toHaveTextContent("Último lugar");
    expect(martes).toHaveTextContent("Completo");
  });

  it("en el celular empieza en el día de hoy y cambia de día con los botones", async () => {
    // Lunes 12/10/2026. jsdom no aplica el CSS: la vista del celular y la de escritorio están las dos,
    // así que el día elegido tiene un título más que los otros.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 10));
    consultar.mockResolvedValue({ horarios: [horario({ dia_semana: 6 })] });
    renderTablero();
    const titulos = (dia: string) => screen.queryAllByRole("heading", { level: 3, name: dia });

    expect(await screen.findByRole("button", { name: "Lunes" })).toHaveAttribute("aria-pressed", "true");
    expect(titulos("Lunes")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Sábado" }));

    expect(screen.getByRole("button", { name: "Sábado" })).toHaveAttribute("aria-pressed", "true");
    expect(titulos("Sábado")).toHaveLength(2);
    expect(titulos("Lunes")).toHaveLength(1);
    vi.useRealTimers();
  });

  it("avisa cuando no hay clases publicadas", async () => {
    consultar.mockResolvedValue({ horarios: [] });

    renderTablero();

    expect(await screen.findByText("Todavía no hay clases publicadas.")).toBeInTheDocument();
  });

  it("ante un error deja reintentar la consulta", async () => {
    consultar.mockRejectedValueOnce(new Error("sin red")).mockResolvedValueOnce({ horarios: [horario()] });
    renderTablero();

    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("region", { name: "Martes" })).toHaveTextContent("Carla Ruiz");
    expect(consultar).toHaveBeenCalledTimes(2);
  });
});
