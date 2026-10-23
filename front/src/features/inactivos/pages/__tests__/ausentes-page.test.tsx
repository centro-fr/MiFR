import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AusentesPage } from "../ausentes-page";
import type { PaginaAlumnosInactivos } from "@/features/inactivos/schemas/inactivos";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockAlumnos: PaginaAlumnosInactivos = {
  datos: [
    {
      id_inscripcion: 101,
      alumno: {
        id_alumno: 1,
        nombre: "Martina",
        apellido: "Sosa",
        telefono: "+5493512345678",
        email: "martina@test.com",
      },
      tutor: null,
      profesora: {
        id_profesora: 5,
        nombre: "Mariana",
        apellido: "Paz",
      },
      plan: {
        id_plan: 2,
        nombre: "Danza Clásica Adultos",
      },
      estado_cuota: "AL_DIA",
      inasistencias_consecutivas: 4,
      fecha_ultima_asistencia: "2026-10-10T18:00:00.000Z",
      gestion: {
        estado: "PENDIENTE",
        fecha_registro: null,
      },
    },
    {
      id_inscripcion: 102,
      alumno: {
        id_alumno: 2,
        nombre: "Facundo",
        apellido: "Ríos",
        telefono: null,
        email: null,
      },
      tutor: {
        nombre: "Patricia",
        apellido: "Ríos",
        telefono: "+5493519876543",
        email: "patricia@test.com",
      },
      profesora: {
        id_profesora: 6,
        nombre: "Clara",
        apellido: "Ruiz",
      },
      plan: {
        id_plan: 3,
        nombre: "Iniciación a la Danza",
      },
      estado_cuota: "POR_VENCER",
      inasistencias_consecutivas: 3,
      fecha_ultima_asistencia: null,
      gestion: {
        estado: "CONTACTADO",
        fecha_registro: "2026-10-18T10:00:00.000Z",
      },
    },
  ],
  total: 2,
  umbral: 3,
  limit: 50,
  offset: 0,
};

const mockMutateRegistrar = vi.fn();
const mockMutateQuitar = vi.fn();

vi.mock("@/features/inactivos/hooks/use-inactivos", () => ({
  useAlumnosInactivos: () => ({
    data: mockAlumnos,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRegistrarSeguimiento: () => ({
    mutateAsync: mockMutateRegistrar,
    isPending: false,
  }),
  useQuitarSeguimiento: () => ({
    mutateAsync: mockMutateQuitar,
    isPending: false,
  }),
}));

vi.mock("@/features/horarios/api/horarios-api", () => ({
  listarProfesoras: vi.fn().mockResolvedValue([
    { id: 5, nombre: "Mariana Paz" },
    { id: 6, nombre: "Clara Ruiz" },
  ]),
}));

vi.mock("@/features/planes/hooks/use-planes", () => ({
  usePlanes: () => ({
    data: [
      { id: 2, nombre: "Danza Clásica Adultos" },
      { id: 3, nombre: "Iniciación a la Danza" },
    ],
  }),
}));

function renderizar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AusentesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AusentesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el encabezado principal", () => {
    renderizar();

    expect(screen.getByRole("heading", { level: 1, name: "Ausentes" })).toBeInTheDocument();
    expect(screen.getByText(/Detección proactiva de alumnos con cuota al día/i)).toBeInTheDocument();
  });

  it("renderiza las pestañas de navegación con estados", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /Por contactar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contactados/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ignorados/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Todos/i })).toBeInTheDocument();
  });

  it("muestra la información de los alumnos ausentes en el listado", () => {
    renderizar();

    expect(screen.getAllByText("Martina Sosa").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Danza Clásica Adultos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4/i).length).toBeGreaterThan(0);

    // Alumno menor con tutor a cargo
    expect(screen.getAllByText("Facundo Ríos").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tutor: Patricia Ríos/i).length).toBeGreaterThan(0);
  });

  it("muestra enlace de WhatsApp dentro del modal de gestión", () => {
    renderizar();

    const botonesGestionar = screen.getAllByRole("button", { name: /Gestionar/i });
    fireEvent.click(botonesGestionar[0]);

    const enlaceWa = screen.getByRole("link", { name: /Abrir WhatsApp con mensaje/i });
    expect(enlaceWa).toBeInTheDocument();
    const href = enlaceWa.getAttribute("href");
    expect(href).toContain("https://wa.me/");
    expect(href).toContain("text=");
  });

  it("abre el modal flotante centrado de gestión al hacer click en Gestionar", () => {
    renderizar();

    const botonesGestionar = screen.getAllByRole("button", { name: /Gestionar/i });
    fireEvent.click(botonesGestionar[0]);

    // Modal se abre
    expect(screen.getByRole("heading", { name: "Seguimiento de alumno" })).toBeInTheDocument();
    expect(screen.getByText(/Acción proactiva para incentivar el reintegro/i)).toBeInTheDocument();

    // Permite elegir nuevo estado Ignorar
    const opcionIgnorar = screen.getByRole("button", { name: /Ignorar por ahora/i });
    fireEvent.click(opcionIgnorar);

    const botonGuardar = screen.getByRole("button", { name: /Guardar seguimiento/i });
    fireEvent.click(botonGuardar);

    expect(mockMutateRegistrar).toHaveBeenCalledWith({
      idInscripcion: 101,
      estado: "IGNORADO",
    });
  });

  it("permite cerrar el modal con el botón Cancelar", async () => {
    renderizar();

    const botonesGestionar = screen.getAllByRole("button", { name: /Gestionar/i });
    fireEvent.click(botonesGestionar[0]);

    expect(screen.getByRole("heading", { name: "Seguimiento de alumno" })).toBeInTheDocument();

    const botonCancelar = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(botonCancelar);

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Seguimiento de alumno" })).not.toBeInTheDocument();
    });
  });
});
