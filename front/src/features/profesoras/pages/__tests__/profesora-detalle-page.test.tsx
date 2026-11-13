import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfesoraDetallePage } from "../profesora-detalle-page";
import type { Profesora, UsuarioDetalleProfesora } from "@/features/profesoras/schemas/profesora";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockProfesora: Profesora = {
  id: 1,
  idUsuario: 10,
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
};

const mockUsuario: UsuarioDetalleProfesora = {
  id_usuario: 10,
  nombre: "Lucía",
  apellido: "Gómez",
  email: "lucia.gomez@example.com",
  telefono: "1144556677",
  dni: "32111222",
  fecha_nacimiento: "1992-05-10",
  direccion: "Av. Corrientes 1234",
  estado: "ACTIVO",
};

const mockMutateActualizar = vi.fn();
const mockMutateDarDeBaja = vi.fn();
let mockHorariosActivos: Array<{
  id_horario: number;
  id_profesora: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number | null;
  actividad: { nombre: string };
}> = [
  {
    id_horario: 1,
    id_profesora: 1,
    dia_semana: 1,
    hora_inicio: "08:00",
    hora_fin: "09:00",
    cupo_maximo: null,
    actividad: { nombre: "Funcional" },
  },
];

vi.mock("@/features/profesoras/hooks/use-profesoras", () => ({
  useProfesoras: () => ({
    data: [mockProfesora],
    isPending: false,
    isError: false,
    error: null,
  }),
  useUsuarioProfesora: () => ({
    data: mockUsuario,
    isPending: false,
    isError: false,
  }),
  useActualizarDatosProfesora: () => ({
    isPending: false,
    isError: false,
    error: null,
    mutate: mockMutateActualizar,
  }),
  useDarDeBajaProfesora: () => ({
    isPending: false,
    isError: false,
    error: null,
    mutate: mockMutateDarDeBaja,
  }),
  useReactivarProfesora: () => ({
    isPending: false,
    isError: false,
    error: null,
    mutate: vi.fn(),
  }),
  useHorariosActivos: () => ({
    data: mockHorariosActivos,
    isPending: false,
    isError: false,
  }),
}));

function renderizar(idRuta = "1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/app/profesoras/${idRuta}`]}>
        <Routes>
          <Route path="/app/profesoras/:id" element={<ProfesoraDetallePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProfesoraDetallePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHorariosActivos = [
      {
        id_horario: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "08:00",
        hora_fin: "09:00",
        cupo_maximo: null,
        actividad: { nombre: "Funcional" },
      },
    ];
  });

  it("renderiza la información completa de la ficha de la profesora sin datos redundantes en el título", () => {
    renderizar("1");

    expect(screen.getByRole("heading", { level: 1, name: "Lucía Gómez" })).toBeInTheDocument();
    expect(screen.getByText("lucia.gomez@example.com")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("32.111.222")).toBeInTheDocument();
    expect(screen.getByText("Av. Corrientes 1234")).toBeInTheDocument();
    expect(screen.getAllByText("Funcional, HIIT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 clase").length).toBeGreaterThan(0);
  });

  it("permite abrir el modal flotante de edición, modificar datos personales y enviarlos", () => {
    renderizar("1");

    fireEvent.click(screen.getByRole("button", { name: "Editar datos" }));

    expect(screen.getByRole("heading", { name: "Editar datos de Lucía Gómez" })).toBeInTheDocument();

    const inputNombre = screen.getByLabelText(/^Nombre/i);
    fireEvent.change(inputNombre, { target: { value: "Lucía María" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mockMutateActualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Lucía María",
        apellido: "Gómez",
        telefono: "1144556677",
      }),
      expect.any(Object),
    );
  });

  it("permite cancelar el modo edición desde el modal y volver a la vista de ficha", () => {
    renderizar("1");

    fireEvent.click(screen.getByRole("button", { name: "Editar datos" }));
    expect(screen.getByRole("heading", { name: "Editar datos de Lucía Gómez" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("heading", { name: "Editar datos de Lucía Gómez" })).not.toBeInTheDocument();
  });

  it("permite cerrar el modal de edición con el botón de cruz X", () => {
    renderizar("1");

    fireEvent.click(screen.getByRole("button", { name: "Editar datos" }));
    expect(screen.getByRole("heading", { name: "Editar datos de Lucía Gómez" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar formulario" }));
    expect(screen.queryByRole("heading", { name: "Editar datos de Lucía Gómez" })).not.toBeInTheDocument();
  });

  it("muestra el diálogo de confirmación de baja y advierte si tiene clases a cargo", () => {
    renderizar("1");

    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(screen.getByText(/tiene clases a cargo$/)).toBeInTheDocument();
    expect(screen.getByText(/Reasigná o dá de baja su clase en Horarios/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Horarios" })).toBeInTheDocument();
  });

  it("permite confirmar la baja si la profesora no tiene clases asignadas", () => {
    mockHorariosActivos = [];
    renderizar("1");

    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }));
    const dialogo = screen.getByRole("alertdialog");
    expect(within(dialogo).getByText("¿Seguro que desea realizar la baja?")).toBeInTheDocument();

    const btnConfirmar = within(dialogo).getByRole("button", { name: "Dar de baja" });
    fireEvent.click(btnConfirmar);

    expect(mockMutateDarDeBaja).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it("muestra las clases a su cargo organizadas y subdivididas por días de la semana", () => {
    mockHorariosActivos = [
      {
        id_horario: 1,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "08:00",
        hora_fin: "09:00",
        cupo_maximo: 15,
        actividad: { nombre: "Funcional" },
      },
      {
        id_horario: 2,
        id_profesora: 1,
        dia_semana: 1,
        hora_inicio: "10:00",
        hora_fin: "11:00",
        cupo_maximo: null,
        actividad: { nombre: "HIIT" },
      },
      {
        id_horario: 3,
        id_profesora: 1,
        dia_semana: 3,
        hora_inicio: "18:00",
        hora_fin: "19:00",
        cupo_maximo: 20,
        actividad: { nombre: "Funcional" },
      },
    ];

    renderizar("1");
    fireEvent.click(screen.getByRole("tab", { name: "Clases" }));

    // Una tarjeta por día, con cuántas clases tiene
    expect(screen.getByRole("heading", { name: "Lunes · 2 clases" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Miércoles · 1 clase" })).toBeInTheDocument();
    expect(screen.getByText("08:00 a 09:00")).toBeInTheDocument();
    expect(screen.getByText("10:00 a 11:00")).toBeInTheDocument();
    expect(screen.getByText("18:00 a 19:00")).toBeInTheDocument();
  });

  it("muestra error amigable si el identificador no corresponde a ninguna profesora", () => {
    renderizar("999");
    expect(screen.getByRole("heading", { level: 2, name: "Profesor/a no encontrado/a" })).toBeInTheDocument();
  });
});
