import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CobrosPage } from "../cobros-page";

const renderCobrosPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CobrosPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

vi.mock("@/features/transferencias/hooks/use-transferencias", () => ({
  useTransferencias: () => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useAprobarTransferencia: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRechazarTransferencia: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockAlumnos = {
  datos: [
    {
      id_alumno: 1,
      id_usuario: 1,
      id_usuario_responsable: null,
      cont_emerg_nombre: null,
      cont_emerg_telefono: null,
      apto_medico: true,
      fecha_apto_medico: "2026-01-01",
      observaciones: null,
      estado: "ACTIVO" as const,
      fecha_alta: "2026-01-01",
      fecha_baja: null,
      usuario: {
        id_usuario: 1,
        nombre: "Mateo",
        apellido: "Fernández",
        dni: "40123456",
        email: "mateo@test.com",
        telefono: "1122334455",
        fecha_nacimiento: "2000-01-01",
        direccion: null,
        estado: "ACTIVO" as const,
      },
      responsable: null,
      inscripcion: {
        id_inscripcion: 1,
        estado: "ACTIVA" as const,
        id_plan: 1,
        nombre_plan: "Plan Básico",
        nombre_profesora: "Lucía García",
      },
      situacion_cuota: {
        estado: "VENCIDA" as const,
        fecha_vencimiento: "2026-10-01",
        dias_restantes: -11,
        puede_asistir: true,
        tiene_pago_pendiente: false,
      },
    },
    {
      id_alumno: 2,
      id_usuario: 2,
      id_usuario_responsable: null,
      cont_emerg_nombre: null,
      cont_emerg_telefono: null,
      apto_medico: true,
      fecha_apto_medico: "2026-01-01",
      observaciones: null,
      estado: "ACTIVO" as const,
      fecha_alta: "2026-01-01",
      fecha_baja: null,
      usuario: {
        id_usuario: 2,
        nombre: "Bautista",
        apellido: "Gómez",
        dni: "41999888",
        email: "bautista@test.com",
        telefono: "1199887766",
        fecha_nacimiento: "2001-01-01",
        direccion: null,
        estado: "ACTIVO" as const,
      },
      responsable: null,
      inscripcion: {
        id_inscripcion: 2,
        estado: "ACTIVA" as const,
        id_plan: 2,
        nombre_plan: "Plan Intermedio",
        nombre_profesora: "Carla Ruiz",
      },
      situacion_cuota: {
        estado: "AL_DIA" as const,
        fecha_vencimiento: "2026-10-25",
        dias_restantes: 13,
        puede_asistir: true,
        tiene_pago_pendiente: false,
      },
    },
  ],
  total: 2,
  limit: 100,
  offset: 0,
};

const mockPlanes = [
  { id: "1", nombre: "Plan Básico", precioVigente: 25000 },
  { id: "2", nombre: "Plan Intermedio", precioVigente: 30000 },
];

const mockPagos = [
  {
    id_pago: 50,
    id_cuota: 50,
    forma_pago: "EFECTIVO" as const,
    estado: "CONFIRMADO" as const,
    monto: 25000,
    fecha_pago: "2026-10-12T10:00:00.000Z",
    rendido: false,
    id_usuario_registra: 1,
  },
];

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: (string | number)[] }) => {
      if (queryKey[0] === "alumnos") {
        return { data: mockAlumnos, isLoading: false };
      }
      if (queryKey[0] === "planes") {
        return { data: mockPlanes, isLoading: false };
      }
      return { data: mockPagos, isLoading: false };
    },
  };
});

vi.mock("../../hooks/use-cobros", () => ({
  useHistorialPagos: () => ({
    data: mockPagos,
    isLoading: false,
  }),
  useRegistrarCobroEfectivo: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useComprobante: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasRole: (rol: string) => rol === "PROFESORA",
    hasPermission: () => true,
  }),
}));

describe("CobrosPage (US-15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza la pantalla de cobros con título y listado de alumnos", () => {
    renderCobrosPage();

    expect(screen.getByRole("heading", { name: /Cobros/i })).toBeInTheDocument();
    expect(screen.getAllByText("Mateo Fernández")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Bautista Gómez")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Plan Básico")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Plan Intermedio")[0]).toBeInTheDocument();
  });

  it("filtra alumnos al buscar por nombre", () => {
    renderCobrosPage();

    const inputBusqueda = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(inputBusqueda, { target: { value: "Mateo" } });

    expect(screen.getAllByText("Mateo Fernández")[0]).toBeInTheDocument();
    expect(screen.queryByText("Bautista Gómez")).not.toBeInTheDocument();
  });

  it("filtra alumnos por estado de cuota Vencidas", () => {
    renderCobrosPage();

    const botonVencidas = screen.getByRole("button", { name: "Vencidas" });
    fireEvent.click(botonVencidas);

    expect(screen.getAllByText("Mateo Fernández")[0]).toBeInTheDocument();
    expect(screen.queryByText("Bautista Gómez")).not.toBeInTheDocument();
  });

  it("abre el modal de cobro en efectivo al presionar Cobrar", () => {
    renderCobrosPage();

    const botonesCobrar = screen.getAllByRole("button", { name: /Cobrar/i });
    fireEvent.click(botonesCobrar[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Registrar cobro en efectivo")).toBeInTheDocument();
  });
});
