import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SuplenciasPage } from "../suplencias-page";
import type { Suplencia } from "@/types/suplencia";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockSuplencias: Suplencia[] = [
  {
    idClase: "1",
    idHorario: "11",
    fechaClase: "2026-10-16",
    horaInicio: "09:00",
    horaFin: "10:00",
    estadoClase: "PROGRAMADA",
    actividad: { id: "1", nombre: "Funcional" },
    titular: { id: "1", nombre: "Lucía", apellido: "Gómez" },
    suplente: { id: "2", nombre: "Mariana", apellido: "Pérez" },
    motivo: "Capacitación",
  },
];

vi.mock("@/features/suplencias/hooks/use-suplencias", () => ({
  useSuplencias: () => ({ data: mockSuplencias, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useRegistrarSuplencia: () => ({ isPending: false, isError: false, error: null, reset: vi.fn(), mutate: vi.fn() }),
  useActualizarSuplencia: () => ({ isPending: false, isError: false, error: null, reset: vi.fn(), mutate: vi.fn() }),
  useEliminarSuplencia: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }),
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
      <MemoryRouter initialEntries={["/app/honorarios/suplencias"]}>
        <SuplenciasPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SuplenciasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el encabezado, pestañas y NO incluye breadcrumbs locales duplicados", () => {
    renderizar();

    // Encabezado principal
    expect(screen.getByRole("heading", { level: 1, name: "Honorarios" })).toBeInTheDocument();
    expect(screen.getByText(/Registro de suplencias docentes/i)).toBeInTheDocument();

    // Pestañas
    expect(screen.getByRole("link", { name: /Liquidación del mes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Suplencias/i })).toBeInTheDocument();

    // NO debe haber un nav con aria-label "Ruta de navegación" duplicado
    expect(screen.queryByRole("navigation", { name: "Ruta de navegación" })).not.toBeInTheDocument();
  });

  it("renderiza el botón superior de acción principal '+ Nueva suplencia'", () => {
    renderizar();
    const botonNueva = screen.getByRole("button", { name: /\+ Nueva suplencia/i });
    expect(botonNueva).toBeInTheDocument();
  });

  it("renderiza la tarjeta de suplencia con los datos correspondientes", async () => {
    renderizar();
    expect(await screen.findByRole("heading", { level: 2, name: "Funcional" })).toBeInTheDocument();
    expect(screen.getByText("Lucía Gómez")).toBeInTheDocument();
    expect(screen.getByText("Mariana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Capacitación")).toBeInTheDocument();
  });

  it("abre el modal flotante centrado de registrar suplencia al hacer clic en '+ Nueva suplencia'", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: /\+ Nueva suplencia/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Registrar suplencia" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Cerrar formulario/i)).toBeInTheDocument();
  });
});
