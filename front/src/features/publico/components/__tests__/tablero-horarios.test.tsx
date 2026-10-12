import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consultarDisponibilidad } from "@/features/publico/api/disponibilidad-api";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { TableroHorarios } from "../tablero-horarios";

vi.mock("@/features/publico/api/disponibilidad-api", () => ({ consultarDisponibilidad: vi.fn() }));

const consultar = vi.mocked(consultarDisponibilidad);

function horario(cambios: Partial<HorarioPublico> = {}): HorarioPublico {
  return {
    id_horario: 1,
    dia_semana: 2,
    hora_inicio: "1970-01-01T18:00:00.000Z",
    hora_fin: "1970-01-01T19:00:00.000Z",
    actividad: { id_actividad: 2, nombre: "Personalizado", descripcion: null, modalidad: "PERSONALIZADA" },
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

// jsdom no aplica el CSS: la cartelera de escritorio (una tabla) y la lista del celular están las dos.
function cartelera() {
  return screen.getByRole("table", { name: "Clases de la semana por día y hora" });
}

describe("TableroHorarios", () => {
  beforeEach(() => {
    consultar.mockReset();
    // Lunes 12/10/2026.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra la carga mientras llegan los horarios", () => {
    consultar.mockReturnValue(new Promise(() => {}));

    renderTablero();

    expect(screen.getByRole("status", { name: "Cargando los horarios" })).toBeInTheDocument();
  });

  it("la cartelera tiene solo los días y las horas con clases, agrupadas por turno", async () => {
    consultar.mockResolvedValue({
      horarios: [
        horario({ id_horario: 1, dia_semana: 1, hora_inicio: "1970-01-01T08:00:00.000Z" }),
        horario(),
        horario({ id_horario: 3, dia_semana: 4, hora_inicio: "1970-01-01T21:00:00.000Z" }),
      ],
    });

    renderTablero();

    await screen.findByRole("table");
    const encabezados = within(cartelera())
      .getAllByRole("columnheader")
      .map((celda) => celda.textContent);
    expect(encabezados).toEqual(["Hora", "Lunes", "Martes", "Jueves", "Mañana", "Tarde", "Noche"]);
    const horas = within(cartelera())
      .getAllByRole("rowheader")
      .map((celda) => celda.textContent);
    expect(horas).toEqual(["08:00", "18:00", "21:00"]);
  });

  it("cada clase muestra la actividad, la profesora y los lugares libres en su día y su hora", async () => {
    consultar.mockResolvedValue({
      horarios: [
        horario(),
        horario({ id_horario: 2, dia_semana: 4, cupo_disponible: 1, disponibilidad: "CASI_LLENO" }),
        horario({ id_horario: 3, dia_semana: 5, cupo_disponible: 0, disponibilidad: "COMPLETO" }),
      ],
    });

    renderTablero();

    await screen.findByRole("table");
    const fila = within(cartelera()).getByRole("row", { name: /^18:00/ });
    const [martes, jueves, viernes] = within(fila).getAllByRole("cell");
    expect(within(martes).getByRole("article", { name: "Personalizado, de 18:00 a 19:00" })).toHaveTextContent(
      "PersonalizadoCarla2 libres",
    );
    expect(jueves).toHaveTextContent("Último lugar");
    expect(viernes).toHaveTextContent("Completo");
  });

  it("en el celular empieza en el próximo día con clases, cambia de día y agrupa por turno", async () => {
    consultar.mockResolvedValue({
      horarios: [
        horario(),
        horario({ id_horario: 2, dia_semana: 6, hora_inicio: "1970-01-01T09:00:00.000Z" }),
      ],
    });
    renderTablero();

    expect(await screen.findByRole("button", { name: "Martes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Lunes" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Martes" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tarde" })).toHaveTextContent("Carla Ruiz");

    fireEvent.click(screen.getByRole("button", { name: "Sábado" }));

    expect(screen.getByRole("heading", { level: 3, name: "Sábado" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mañana" })).toHaveTextContent("09:00");
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

    expect(await screen.findByRole("table")).toHaveTextContent("Carla");
    expect(consultar).toHaveBeenCalledTimes(2);
  });
});
