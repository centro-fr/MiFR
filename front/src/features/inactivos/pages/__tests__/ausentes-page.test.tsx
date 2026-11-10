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
    expect(screen.getByText("Busca los alumnos ausentes que queres contactar")).toBeInTheDocument();
  });

  it("renderiza las pestañas de navegación con estados", () => {
    renderizar();

    expect(screen.getAllByRole("button", { name: /Por contactar/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Contactados/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Ignorados/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Todos/i }).length).toBeGreaterThan(0);
  });

  it("muestra la información de los alumnos ausentes en el listado sin plan ni profesora en la fila", () => {
    renderizar();

    expect(screen.getAllByText("Martina Sosa").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Prof\./i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/4/i).length).toBeGreaterThan(0);

    // Alumno menor con tutor a cargo
    expect(screen.getAllByText("Facundo Ríos").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tutor: Patricia Ríos/i).length).toBeGreaterThan(0);
  });

  it("muestra enlaces directos de WhatsApp, Mail y Teléfono en la fila", () => {
    renderizar();

    const enlacesWa = screen.getAllByRole("link", { name: /Abrir WhatsApp con mensaje/i });
    expect(enlacesWa.length).toBeGreaterThan(0);
    const hrefWa = enlacesWa[0].getAttribute("href");
    expect(hrefWa).toContain("https://wa.me/");
    expect(hrefWa).toContain("text=");

    const enlacesMail = screen.getAllByRole("link", { name: /Enviar email/i });
    expect(enlacesMail.length).toBeGreaterThan(0);
    expect(enlacesMail[0].getAttribute("href")).toContain("mailto:");

    const enlacesTel = screen.getAllByRole("link", { name: /Llamar/i });
    expect(enlacesTel.length).toBeGreaterThan(0);
    expect(enlacesTel[0].getAttribute("href")).toContain("tel:");
  });

  it("registra directamente como contactado al presionar el botón Contactado sin abrir modal", () => {
    renderizar();

    const botonesContactar = screen.getAllByRole("button", { name: "Contactado" });
    fireEvent.click(botonesContactar[0]);

    // Llama directamente a registrar seguimiento sin abrir ningún modal
    expect(mockMutateRegistrar).toHaveBeenCalledWith({
      idInscripcion: 101,
      estado: "CONTACTADO",
    });
    expect(screen.queryByRole("heading", { name: "Seguimiento de alumno" })).not.toBeInTheDocument();
  });

  it("permite ignorar directamente a un alumno con el botón Ignorar", () => {
    renderizar();

    const botonesIgnorar = screen.getAllByRole("button", { name: "Ignorar" });
    fireEvent.click(botonesIgnorar[0]);

    expect(mockMutateRegistrar).toHaveBeenCalledWith({
      idInscripcion: 101,
      estado: "IGNORADO",
    });
  });

  it("permite revertir el estado con el botón Revertir", () => {
    renderizar();

    const botonesRevertir = screen.getAllByRole("button", { name: "Revertir" });
    fireEvent.click(botonesRevertir[0]);

    expect(mockMutateQuitar).toHaveBeenCalledWith(102);
  });

  it("muestra la columna Estado únicamente en la pestaña Todos", () => {
    renderizar();

    // Por defecto inicia en "Por contactar": no debe estar la columna Estado
    expect(screen.queryByRole("columnheader", { name: /Estado/i })).not.toBeInTheDocument();

    // Al cambiar a "Todos", aparece la columna Estado
    const botonesTodos = screen.getAllByRole("button", { name: /Todos/i });
    fireEvent.click(botonesTodos[0]);

    expect(screen.getByRole("columnheader", { name: /Estado/i })).toBeInTheDocument();
  });
});
