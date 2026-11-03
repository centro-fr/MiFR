import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfesorasPage } from "../profesoras-page";
import type { Profesora } from "@/features/profesoras/schemas/profesora";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockProfesoras: Profesora[] = [
  {
    id: 1,
    idUsuario: 1,
    nombreCompleto: "Lucía Gómez",
    nombre: "Lucía",
    apellido: "Gómez",
    email: "lucia.gomez@example.com",
    telefono: "1144556677",
    fechaNacimiento: "1992-05-10",
    especialidad: "Funcional",
    fechaAlta: "2026-01-01T00:00:00.000Z",
    fechaBaja: null,
    activa: true,
  },
  {
    id: 2,
    idUsuario: 2,
    nombreCompleto: "Carla Ruiz",
    nombre: "Carla",
    apellido: "Ruiz",
    email: "carla.ruiz@example.com",
    telefono: null,
    fechaNacimiento: null,
    especialidad: "GAP",
    fechaAlta: "2026-01-01T00:00:00.000Z",
    fechaBaja: "2026-02-01T00:00:00.000Z",
    activa: false,
  },
];

const mockMutateCrear = vi.fn();
const mockMutateDarDeBaja = vi.fn();
let mockHorariosActivos: Array<{ id_profesora: number; actividad: { nombre: string } }> = [];

vi.mock("@/features/profesoras/hooks/use-profesoras", () => ({
  useProfesoras: () => ({
    data: mockProfesoras,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCrearProfesora: () => ({
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    mutate: mockMutateCrear,
  }),
  useDarDeBajaProfesora: () => ({
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    mutate: mockMutateDarDeBaja,
  }),
  useHorariosActivos: () => ({
    data: mockHorariosActivos,
    isPending: false,
    isError: false,
  }),
}));

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/profesoras"]}>
        <ProfesorasPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProfesorasPage (US-38)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHorariosActivos = [];
  });

  it("renderiza el título principal, subtítulo y botón de acción", () => {
    renderizar();
    expect(screen.getByRole("heading", { level: 1, name: "Plantel de Profesores" })).toBeInTheDocument();
    expect(screen.getByText(/Equipo docente del centro/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Nuevo/a profesor/a" })).toBeInTheDocument();
  });

  it("muestra por defecto las profesoras activas y filtra las dadas de baja en la pestaña Activas", () => {
    renderizar();
    // Lucía Gómez está activa
    expect(screen.getAllByText("Lucía Gómez").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Funcional").length).toBeGreaterThan(0);
    // Carla Ruiz está dada de baja, no debe figurar en la pestaña Activas
    expect(screen.queryByText("Carla Ruiz")).not.toBeInTheDocument();
  });

  it("muestra todas las profesoras al cambiar a la pestaña 'Historial completo'", () => {
    renderizar();
    const tabTodas = screen.getByRole("button", { name: /Historial completo/i });
    fireEvent.click(tabTodas);

    expect(screen.getAllByText("Lucía Gómez").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Carla Ruiz").length).toBeGreaterThan(0);
  });

  it("permite filtrar por búsqueda de texto", () => {
    renderizar();
    const inputBusqueda = screen.getByPlaceholderText(/Buscar por nombre o especialidad/i);
    fireEvent.change(inputBusqueda, { target: { value: "inexistente" } });

    expect(screen.getByText("Sin resultados para tu búsqueda")).toBeInTheDocument();
  });

  it("abre el modal de alta al presionar '+ Nuevo/a profesor/a' y permite cancelarlo", () => {
    renderizar();
    const btnNuevo = screen.getByRole("button", { name: "+ Nuevo/a profesor/a" });
    fireEvent.click(btnNuevo);

    expect(screen.getByRole("heading", { level: 2, name: "Dar de alta profesor/a" })).toBeInTheDocument();

    const btnCancelar = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(btnCancelar);

    expect(screen.queryByRole("heading", { level: 2, name: "Dar de alta profesor/a" })).not.toBeInTheDocument();
  });

  it("abre el diálogo de confirmación de baja al hacer clic en 'Dar de baja'", () => {
    renderizar();
    const botonesBaja = screen.getAllByRole("button", { name: /Dar de baja/i });
    fireEvent.click(botonesBaja[0]);

    expect(screen.getByText("¿Dar de baja a este/a profesor/a?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar baja" })).toBeInTheDocument();

    const btnCancelarBaja = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(btnCancelarBaja);
    expect(screen.queryByText("¿Dar de baja a este/a profesor/a?")).not.toBeInTheDocument();
  });

  it("permite completar el formulario de alta directa y enviar los datos", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "+ Nuevo/a profesor/a" }));

    fireEvent.change(screen.getByPlaceholderText("Ej: Laura"), { target: { value: "Laura" } });
    fireEvent.change(screen.getByPlaceholderText("Ej: García"), { target: { value: "García" } });
    fireEvent.change(screen.getByPlaceholderText("ejemplo@gmail.com"), { target: { value: "laura@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Ej: 11 2345-6789"), { target: { value: "1144556677" } });
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), { target: { value: "1994-06-15" } });
    fireEvent.change(screen.getByPlaceholderText(/Pilates Reformer/i), { target: { value: "Pilates" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar profesor/a" }));

    expect(mockMutateCrear).toHaveBeenCalledWith(
      {
        nombre: "Laura",
        apellido: "García",
        email: "laura@example.com",
        telefono: "1144556677",
        fecha_nacimiento: "1994-06-15",
        especialidad: "Pilates",
      },
      expect.any(Object),
    );
  });

  it("advierte si la profesora tiene clases activas a su cargo y ofrece ir a Horarios", () => {
    mockHorariosActivos = [
      { id_profesora: 1, actividad: { nombre: "Funcional" } },
      { id_profesora: 1, actividad: { nombre: "HIIT" } },
    ];
    renderizar();

    expect(screen.getAllByText("2 clases").length).toBeGreaterThan(0);

    const botonesBaja = screen.getAllByRole("button", { name: /Dar de baja/i });
    fireEvent.click(botonesBaja[0]);

    expect(screen.getByText(/Tiene 2 clases semanales asignadas/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Horarios" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar baja" })).not.toBeInTheDocument();
  });
});

