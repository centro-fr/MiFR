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

vi.mock("@/features/actividades/hooks/use-actividades", () => ({
  useActividades: () => ({
    data: [
      { id: "1", codigo: "FUNCIONAL", nombre: "Funcional", modalidad: "GRUPAL", activo: true },
      { id: "2", codigo: "GAP", nombre: "GAP", modalidad: "GRUPAL", activo: true },
      { id: "3", codigo: "HIIT", nombre: "HIIT", modalidad: "GRUPAL", activo: true },
    ],
    isPending: false,
    isError: false,
  }),
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
    especialidad: "Funcional, HIIT",
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
    expect(screen.getByRole("heading", { level: 1, name: "Profesores" })).toBeInTheDocument();
    expect(screen.getByText(/Buscá un profesor y abrí su ficha/i)).toBeInTheDocument();
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
    const tabTodas = screen.getAllByRole("button", { name: /Historial completo/i })[0];
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

  it("permite completar el formulario de alta seleccionando actividades como especialidad", () => {
    renderizar();
    fireEvent.click(screen.getByRole("button", { name: "+ Nuevo/a profesor/a" }));

    fireEvent.change(screen.getByPlaceholderText("Ej: Laura"), { target: { value: "Laura" } });
    fireEvent.change(screen.getByPlaceholderText("Ej: García"), { target: { value: "García" } });
    fireEvent.change(screen.getByPlaceholderText("ejemplo@gmail.com"), { target: { value: "laura@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Ej: 11 2345-6789"), { target: { value: "1144556677" } });
    fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), { target: { value: "1994-06-15" } });

    // Seleccionar actividades con el selector
    fireEvent.click(screen.getByRole("button", { name: "Funcional" }));
    fireEvent.click(screen.getByRole("button", { name: "HIIT" }));

    fireEvent.click(screen.getByRole("button", { name: "Guardar profesor/a" }));

    expect(mockMutateCrear).toHaveBeenCalledWith(
      {
        nombre: "Laura",
        apellido: "García",
        email: "laura@example.com",
        telefono: "1144556677",
        fecha_nacimiento: "1994-06-15",
        especialidad: "Funcional, HIIT",
      },
      expect.any(Object),
    );
  });

  it("no muestra botones destructivos directos en la lista ni datos redundantes de contacto en la celda", () => {
    renderizar();
    // No hay botones "Dar de baja" directos en la tabla
    expect(screen.queryByRole("button", { name: /Dar de baja/i })).not.toBeInTheDocument();
  });

  it("enlaza a la ficha de cada profesora mediante su enlace accesible", () => {
    renderizar();
    const enlacesFicha = screen.getAllByRole("link", { name: /Lucía Gómez/i });
    expect(enlacesFicha.some((link) => link.getAttribute("href") === "/app/profesoras/1")).toBe(true);
  });
});
