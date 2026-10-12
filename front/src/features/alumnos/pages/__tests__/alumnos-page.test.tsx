import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { QueryObserverSuccessResult } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAlumnos } from "@/features/alumnos/hooks/use-alumnos";
import { AlumnosPage } from "@/features/alumnos/pages/alumnos-page";
import type { RespuestaAlumnos } from "@/features/alumnos/schemas/alumno";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/alumnos/hooks/use-alumnos", () => ({
  useAlumnos: vi.fn(),
}));

vi.mock("@/features/actividades/hooks/use-actividades", () => ({
  useActividades: () => ({ data: [] }),
}));

vi.mock("@/features/planes/hooks/use-planes", () => ({
  usePlanes: () => ({ data: [] }),
}));

vi.mock("@/features/horarios/api/horarios-api", () => ({
  listarProfesoras: vi.fn().mockResolvedValue([]),
}));

const consultaMock = vi.mocked(useAlumnos);
const items = [
  {
    id_alumno: 1,
    nombre_completo: "Camila Pérez",
    dni: "35123456",
    telefono: "11 5555-0101",
    estado: "ACTIVO" as const,
    plan: "Funcional mensual",
    profesora: "Lucía Gómez",
  },
];

function crearResultado(data: RespuestaAlumnos): QueryObserverSuccessResult<RespuestaAlumnos, Error> {
  return {
    data,
    dataUpdatedAt: 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    status: "success",
    fetchStatus: "idle",
    isEnabled: true,
    refetch: async () => crearResultado(data),
  };
}

function establecerConsulta(data: RespuestaAlumnos = { items, total: 30, limit: 25, offset: 0 }) {
  consultaMock.mockReturnValue(crearResultado(data));
}

function renderListado() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(["profesoras"], []);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AlumnosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AlumnosPage", () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.clearAllMocks();
    establecerConsulta();
  });

  it("presenta resultados para mobile y desktop y conecta filtros y paginación", () => {
    renderListado();

    expect(screen.getByRole("heading", { name: "Alumnos" })).toBeInTheDocument();
    expect(screen.getAllByText("Camila Pérez")).toHaveLength(2);
    expect(screen.getAllByText("Activo").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText("Camila Pérez").find((element) => element.tagName === "H2")?.closest(".shadow-sm"),
    ).toHaveClass("dark:bg-slate-800");
    expect(
      screen.getAllByText("Activo").find((element) => element.className.includes("dark:bg-emerald-950/70")),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Ver ficha/ }).every((link) => link.getAttribute("href") === "/app/alumnos/1"),
    ).toBe(true);

    fireEvent.change(screen.getAllByLabelText("Estado")[0], { target: { value: "ACTIVO" } });
    expect(consultaMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado: "ACTIVO", offset: 0, limit: 25 }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(consultaMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado: "ACTIVO", offset: 25 }),
    );
  });

  it("debouncea la búsqueda y permite limpiar filtros cuando no hay resultados", async () => {
    vi.useFakeTimers();
    establecerConsulta({ items: [], total: 0, limit: 25, offset: 0 });
    renderListado();

    const busqueda = screen.getByLabelText("Buscar por nombre, apellido o DNI del alumno o de su tutor");
    fireEvent.change(busqueda, { target: { value: "  Pérez  " } });
    expect(consultaMock).toHaveBeenLastCalledWith(expect.objectContaining({ busqueda: "" }));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(consultaMock).toHaveBeenLastCalledWith(expect.objectContaining({ busqueda: "Pérez" }));
    expect(screen.getByRole("heading", { name: "No encontramos alumnos" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda y filtros" }));
    expect(busqueda).toHaveValue("");
  });
});
