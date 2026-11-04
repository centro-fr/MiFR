import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SuplenciasPage } from "../suplencias-page";
import type { TarifaHonorario } from "@/types/honorarios";
import type { Suplencia } from "@/types/suplencia";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

let mockAbierto = true;
vi.mock("@/features/honorarios/utils/periodo", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/features/honorarios/utils/periodo")>();
  return { ...real, mesSigueAbierto: () => mockAbierto };
});

function suplencia(id: string, cambios: Partial<Suplencia> = {}): Suplencia {
  return {
    idClase: id,
    idHorario: "11",
    fechaClase: "2026-10-16",
    horaInicio: "09:00",
    horaFin: "10:30",
    estadoClase: "DICTADA",
    actividad: { id: "1", nombre: "Funcional" },
    titular: { id: "1", nombre: "Lucía", apellido: "Gómez" },
    suplente: { id: "2", nombre: "Mariana", apellido: "Pérez" },
    motivo: "Capacitación",
    ...cambios,
  };
}

let mockSuplencias: Suplencia[] = [];
const mockUseSuplencias = vi.fn();
const tarifas: TarifaHonorario[] = [
  { id: 1, concepto: "HORA_SUPLENCIA", idProfesora: 2, tipoValor: "MONTO_FIJO", valor: 4000, desde: "2026-01-01", hasta: null },
];

vi.mock("@/features/suplencias/hooks/use-suplencias", () => ({
  useSuplencias: (filtros: unknown) => {
    mockUseSuplencias(filtros);
    return { data: mockSuplencias, isPending: false, isError: false, error: null, refetch: vi.fn() };
  },
  useRegistrarSuplencia: () => ({ isPending: false, isError: false, error: null, reset: vi.fn(), mutate: vi.fn() }),
  useActualizarSuplencia: () => ({ isPending: false, isError: false, error: null, reset: vi.fn(), mutate: vi.fn() }),
  useEliminarSuplencia: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/features/honorarios/hooks/use-honorarios", () => ({
  useTarifas: () => ({ data: tarifas }),
  useRegistrarTarifa: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("@/features/honorarios/components/dialogo-configuracion", () => ({
  DialogoConfiguracion: () => null,
}));

vi.mock("@/features/horarios/api/horarios-api", () => ({
  listarHorarios: vi.fn().mockResolvedValue([]),
  listarProfesoras: vi.fn().mockResolvedValue([
    { id: "1", nombre: "Lucía", apellido: "Gómez" },
    { id: "2", nombre: "Mariana", apellido: "Pérez" },
  ]),
}));

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/honorarios/suplencias?mes=2026-10"]}>
        <SuplenciasPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SuplenciasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAbierto = true;
    mockSuplencias = [suplencia("1"), suplencia("2", { estadoClase: "CANCELADA", fechaClase: "2026-10-20" })];
  });

  it("muestra las suplencias del mes elegido, con el encabezado y las pestañas de Honorarios", () => {
    renderizar();

    expect(screen.getByRole("heading", { level: 1, name: "Honorarios" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Honorarios del mes/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Suplencias/ })).toBeInTheDocument();
    expect(mockUseSuplencias).toHaveBeenCalledWith({ desde: "2026-10-01", hasta: "2026-10-31" });
    expect(screen.getByRole("status")).toHaveTextContent("Octubre sigue abierto.");
  });

  it("calcula lo que se le paga a quien cubrió con su valor por hora y no paga la clase cancelada", () => {
    renderizar();

    const resumen = screen.getByRole("region", { name: "Resumen de las suplencias" });
    expect(within(resumen).getByText("$ 6.000")).toBeInTheDocument();
    expect(within(resumen).getByText("1,5 horas en total")).toBeInTheDocument();
    const tabla = screen.getByRole("table");
    const dictada = within(tabla).getByRole("row", { name: /16\/10\/2026/ });
    expect(within(dictada).getByText("Mariana Pérez")).toBeInTheDocument();
    expect(within(dictada).getByText("$ 6.000")).toBeInTheDocument();
    const cancelada = within(tabla).getByRole("row", { name: /20\/10\/2026/ });
    expect(within(cancelada).getByText("No se dictó")).toBeInTheDocument();
    expect(within(cancelada).queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
  });

  it("registra en un diálogo centrado y pide confirmación para eliminar", () => {
    renderizar();

    fireEvent.click(screen.getByRole("button", { name: "Registrar suplencia" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Registrar suplencia" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Cerrar formulario/));

    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar la suplencia del 16/10/2026" }));
    expect(screen.getByRole("alertdialog", { name: "¿Eliminar la suplencia?" })).toBeInTheDocument();
  });

  it("con el mes cerrado no se registra ni se corrige nada", () => {
    mockAbierto = false;
    renderizar();

    expect(screen.getByRole("status")).toHaveTextContent("Octubre está cerrado.");
    expect(screen.queryByRole("button", { name: "Registrar suplencia" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar la suplencia/ })).not.toBeInTheDocument();
  });

  it("sin suplencias en el mes lo dice y ofrece registrar una", () => {
    mockSuplencias = [];
    renderizar();

    expect(screen.getByRole("heading", { level: 2, name: "No hubo suplencias en octubre 2026" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Registrar suplencia" })).toHaveLength(2);
  });
});
