import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FichaAlumnoPage } from "@/features/alumnos/pages/ficha-alumno-page";
import { useDarDeBajaAlumno, useFichaAlumno } from "@/features/alumnos/hooks/use-ficha-alumno";
import { crearFicha } from "@/features/alumnos/__tests__/ficha-de-prueba";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/features/alumnos/hooks/use-ficha-alumno", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/alumnos/hooks/use-ficha-alumno")>()),
  useFichaAlumno: vi.fn(),
  useDarDeBajaAlumno: vi.fn(),
}));

// jsdom no trae ResizeObserver y el RadioGroup de Radix lo usa para medir.
vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

type ResultadoFicha = ReturnType<typeof useFichaAlumno>;

function simularConsulta(resultado: Partial<ResultadoFicha>) {
  vi.mocked(useFichaAlumno).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...resultado,
  } as ResultadoFicha);
}

function errorHttp(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("error", "ERR", config, null, { status, statusText: "", data: {}, headers: {}, config });
}

function renderizarEn(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/app/alumnos/baja/:idAlumno" element={<FichaAlumnoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FichaAlumnoPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(crearSesion(crearUsuario(["PROPIETARIA"], ["ALUMNOS_VER", "ALUMNOS_EDITAR"])));
    vi.mocked(useDarDeBajaAlumno).mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useDarDeBajaAlumno>);
  });

  it("muestra un estado de carga mientras llega la ficha", () => {
    simularConsulta({ isPending: true });
    renderizarEn("/app/alumnos/baja/1");

    expect(screen.getByRole("status")).toHaveTextContent("Cargando ficha del alumno…");
  });

  it("muestra la ficha cuando la consulta responde", () => {
    simularConsulta({ data: crearFicha() });
    renderizarEn("/app/alumnos/baja/1");

    expect(screen.getByRole("heading", { level: 1, name: "Martina Bianchi" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Secciones de la ficha" })).toBeInTheDocument();
  });

  it("muestra 'Alumno no encontrado' ante un 404", () => {
    simularConsulta({ isError: true, error: errorHttp(404) });
    renderizarEn("/app/alumnos/baja/99");

    expect(screen.getByRole("heading", { name: "Alumno no encontrado" })).toBeInTheDocument();
  });

  it("ofrece reintentar ante otros errores", () => {
    simularConsulta({ isError: true, error: errorHttp(500) });
    renderizarEn("/app/alumnos/baja/1");

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  // Un id que no es SERIAL no puede existir: ni siquiera se consulta a la API.
  it("no consulta la API si el id de la URL no es válido", () => {
    simularConsulta({});
    renderizarEn("/app/alumnos/baja/abc");

    expect(screen.getByRole("heading", { name: "Alumno no encontrado" })).toBeInTheDocument();
    expect(useFichaAlumno).not.toHaveBeenCalled();
  });

  it("enlaza de vuelta al listado de alumnos", () => {
    simularConsulta({ data: crearFicha() });
    renderizarEn("/app/alumnos/baja/1");

    expect(screen.getByRole("link", { name: "Volver al listado de alumnos" })).toHaveAttribute("href", "/app/alumnos");
  });

  it("abre la confirmación de baja desde el botón Dar de baja", () => {
    simularConsulta({ data: crearFicha() });
    renderizarEn("/app/alumnos/baja/1");

    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(screen.getByRole("alertdialog", { name: "¿Dar de baja a Martina Bianchi?" })).toBeInTheDocument();
  });
});
