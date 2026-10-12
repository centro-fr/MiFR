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

// jsdom no aplica el CSS: la grilla de escritorio y la lista del celular están las dos en el DOM.
// En la grilla cada día es una sección con su nombre; en la lista, los días son botones.
function columnaDe(dia: string) {
  return screen.getByRole("region", { name: dia });
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

  it("la grilla ubica cada clase en su día con el horario, la profesora y los lugares libres", async () => {
    consultar.mockResolvedValue({
      horarios: [
        horario(),
        horario({ id_horario: 2, dia_semana: 4, cupo_disponible: 1, disponibilidad: "CASI_LLENO" }),
        horario({ id_horario: 3, dia_semana: 5, cupo_disponible: 0, disponibilidad: "COMPLETO" }),
      ],
    });

    renderTablero();

    const martes = await screen.findByRole("region", { name: "Martes" });
    const clase = within(martes).getByRole("article", { name: "Entrenamiento Personalizado, de 09:00 a 10:00" });
    expect(clase).toHaveTextContent("09:00 - 10:00 hs");
    expect(clase).toHaveTextContent("Carla");
    expect(clase).toHaveTextContent("2 libres");
    expect(columnaDe("Jueves")).toHaveTextContent("Último lugar");
    expect(columnaDe("Viernes")).toHaveTextContent("Completo");
    expect(columnaDe("Lunes")).toBeEmptyDOMElement();
  });

  it("la grilla ubica cada clase según su hora y la estira según su duración", async () => {
    consultar.mockResolvedValue({
      horarios: [
        horario(),
        horario({ id_horario: 2, hora_inicio: "1970-01-01T10:30:00.000Z", hora_fin: "1970-01-01T12:00:00.000Z" }),
      ],
    });

    renderTablero();

    const martes = await screen.findByRole("region", { name: "Martes" });
    const [primera, segunda] = within(martes).getAllByRole("article");
    // 104 px por hora: la de 10:30 a 12:00 empieza 1,5 horas después del inicio de la grilla.
    expect(primera).toHaveStyle({ top: "2px", height: "100px" });
    expect(segunda).toHaveStyle({ top: "158px", height: "152px" });
  });

  it("en el celular empieza en el próximo día con clases y cambia de día con los botones", async () => {
    consultar.mockResolvedValue({ horarios: [horario(), horario({ id_horario: 2, dia_semana: 6 })] });
    renderTablero();

    expect(await screen.findByRole("button", { name: "Martes, 1 clase" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Lunes, 0 clases" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("heading", { level: 3, name: "Martes" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lunes, 0 clases" }));

    expect(screen.getByRole("heading", { level: 3, name: "Lunes" })).toBeInTheDocument();
    expect(screen.getByText("No hay clases este día")).toBeInTheDocument();
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

    expect(await screen.findByRole("region", { name: "Martes" })).toHaveTextContent("Carla");
    expect(consultar).toHaveBeenCalledTimes(2);
  });
});
