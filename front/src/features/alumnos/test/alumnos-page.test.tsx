import type { ReactNode } from "react";
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

const consultaMock = vi.mocked(useAlumnos);
const items = [
  {
    id_alumno: 1,
    nombre_completo: "Camila Pérez",
    dni: "35123456",
    telefono: "11 5555-0101",
    estado: "ACTIVO" as const,
    plan: "Funcional mensual",
    id_plan: 1,
    estado_cuota: "AL_DIA" as const,
    fecha_vencimiento: "2026-10-20",
    profesora: "Lucía Gómez",
    id_profesora: 1,
    actividad: "Funcional grupal",
    id_actividad: 1,
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
  return render(
    <MemoryRouter>
      <AlumnosPage />
    </MemoryRouter>,
  );
}

describe("AlumnosPage", () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.clearAllMocks();
    establecerConsulta();
  });

  it("presenta resultados mobile/desktop y conecta los filtros y la paginación con la consulta", () => {
    renderListado();

    const main = screen.getByRole("main");
    expect(main).toHaveClass("mx-auto", "w-full", "max-w-[1240px]");
    expect(screen.getAllByText("Camila Pérez")).toHaveLength(2);
    expect(screen.getAllByText("Al día").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText("Camila Pérez").find((element) => element.tagName === "H2")?.closest(".shadow-sm"),
    ).toHaveClass("dark:bg-slate-800");
    expect(
      screen
        .getAllByText("Al día")
        .find((element) => element.className.includes("dark:bg-emerald-950/70")),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Ver ficha/ }).every((link) => link.getAttribute("href") === "/app/alumnos/1"),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Vencida" }));
    expect(consultaMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado_cuota: "VENCIDA", offset: 0, limit: 25 }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(consultaMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado_cuota: "VENCIDA", offset: 25 }),
    );
  });

  it("debouncea la búsqueda y muestra el estado vacío con opción de limpiar", async () => {
    vi.useFakeTimers();
    establecerConsulta({ items: [], total: 0, limit: 25, offset: 0 });
    renderListado();

    fireEvent.change(screen.getByLabelText("Buscar por nombre, DNI, teléfono o email"), {
      target: { value: "  Pérez  " },
    });
    expect(consultaMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "" }));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(consultaMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Pérez" }));
    expect(screen.getByRole("heading", { name: "No encontramos alumnos" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda y filtros" }));
    expect(screen.getByLabelText("Buscar por nombre, DNI, teléfono o email")).toHaveValue("");
  });
});
