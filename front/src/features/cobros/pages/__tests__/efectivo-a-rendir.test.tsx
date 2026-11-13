import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PanelEfectivoARendir } from "../../components/panel-efectivo-a-rendir";
import type { EfectivoPendiente, PaginaRendiciones } from "../../schemas/rendicion";

const mockMutateRendirCobro = vi.fn();
const mockMutateRendirLote = vi.fn();

const mockEfectivoPendiente: EfectivoPendiente = {
  total: 55000,
  cantidad: 2,
  limit: 100,
  offset: 0,
  profesoras: [
    {
      id_profesora: 1,
      nombre: "Lucía",
      apellido: "García",
      cantidad: 1,
      total: 25000,
    },
    {
      id_profesora: 2,
      nombre: "Carla",
      apellido: "Ruiz",
      cantidad: 1,
      total: 30000,
    },
  ],
  cobros: [
    {
      id_pago: 101,
      monto: 25000,
      fecha_pago: "2026-10-05T10:00:00.000Z",
      dias_sin_rendir: 18,
      alumno: {
        id_alumno: 1,
        nombre: "Mateo",
        apellido: "Fernández",
        dni: "40123456",
      },
      plan: "Plan Básico",
      cuota: {
        numero: 1,
        vencimiento: "2026-10-01",
      },
      profesora: {
        id_profesora: 1,
        nombre: "Lucía",
        apellido: "García",
      },
    },
    {
      id_pago: 102,
      monto: 30000,
      fecha_pago: "2026-10-20T10:00:00.000Z",
      dias_sin_rendir: 3,
      alumno: {
        id_alumno: 2,
        nombre: "Bautista",
        apellido: "Gómez",
        dni: "41999888",
      },
      plan: "Plan Intermedio",
      cuota: {
        numero: 1,
        vencimiento: "2026-10-15",
      },
      profesora: {
        id_profesora: 2,
        nombre: "Carla",
        apellido: "Ruiz",
      },
    },
  ],
};

const mockHistorialRendiciones: PaginaRendiciones = {
  total: 1,
  limit: 50,
  offset: 0,
  datos: [
    {
      id_pago: 99,
      monto: 20000,
      fecha_pago: "2026-09-28T10:00:00.000Z",
      fecha_rendicion: "2026-10-01T15:30:00.000Z",
      alumno: {
        id_alumno: 3,
        nombre: "Sofía",
        apellido: "López",
        dni: "39876543",
      },
      plan: "Plan Básico",
      cuota: {
        numero: 1,
        vencimiento: "2026-09-25",
      },
      profesora: {
        id_profesora: 1,
        nombre: "Lucía",
        apellido: "García",
      },
    },
  ],
};

let mockHookEfectivoData: EfectivoPendiente | null = mockEfectivoPendiente;
let mockHookHistorialData: PaginaRendiciones | null = mockHistorialRendiciones;
let mockCargandoEfectivo = false;
let mockCargandoHistorial = false;

vi.mock("../../hooks/use-rendiciones", () => ({
  useEfectivoPendiente: () => ({
    data: mockHookEfectivoData,
    isLoading: mockCargandoEfectivo,
  }),
  useHistorialRendiciones: () => ({
    data: mockHookHistorialData,
    isLoading: mockCargandoHistorial,
  }),
  useRendirCobro: () => ({
    mutateAsync: mockMutateRendirCobro,
    isPending: false,
  }),
  useRendirLote: () => ({
    mutateAsync: mockMutateRendirLote,
    isPending: false,
  }),
}));

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PanelEfectivoARendir />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("PanelEfectivoARendir (US-19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookEfectivoData = mockEfectivoPendiente;
    mockHookHistorialData = mockHistorialRendiciones;
    mockCargandoEfectivo = false;
    mockCargandoHistorial = false;
  });

  it("renderiza la tabla de cobros pendientes con alumnos, planes y profesoras", () => {
    renderPanel();

    expect(screen.getAllByText("Mateo Fernández")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Bautista Gómez")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Plan Básico")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Plan Intermedio")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Lucía García")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Carla Ruiz")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Hace 18 d")[0]).toBeInTheDocument();
  });

  it("registra la rendición directamente al hacer clic en 'Rendir' en un cobro sin abrir modal", async () => {
    mockMutateRendirCobro.mockResolvedValueOnce({
      rendidos: [101],
      cantidad: 1,
      total: 25000,
      salteados: [],
    });

    renderPanel();

    const botonRendirIndividual = screen.getAllByRole("button", {
      name: /Rendir cobro de Mateo Fernández/i,
    })[0];
    fireEvent.click(botonRendirIndividual);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockMutateRendirCobro).toHaveBeenCalledWith(
        {
          idPago: 101,
          observaciones: undefined,
        },
        expect.anything()
      );
    });
  });

  it("permite conmutar a la pestaña 'Historial rendido' y ver rendiciones previas", () => {
    renderPanel();

    const botonHistorial = screen.getByRole("button", { name: /Historial rendido/i });
    fireEvent.click(botonHistorial);

    expect(screen.getAllByText("Sofía López")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Lucía García")[0]).toBeInTheDocument();
  });

  it("filtra por búsqueda por nombre de profesora o alumno", () => {
    renderPanel();

    const inputBuscar = screen.getByPlaceholderText(/Buscar por profesor\/a o alumno.../i);
    fireEvent.change(inputBuscar, { target: { value: "Carla" } });

    // Bautista Gómez (alumno de Carla Ruiz) visible, Mateo Fernández oculto
    expect(screen.getAllByText("Bautista Gómez")[0]).toBeInTheDocument();
    expect(screen.queryByText("Mateo Fernández")).not.toBeInTheDocument();
  });

  it("muestra estado de caja al día cuando no hay efectivo pendiente", () => {
    mockHookEfectivoData = {
      total: 0,
      cantidad: 0,
      profesoras: [],
      cobros: [],
      limit: 100,
      offset: 0,
    };

    renderPanel();

    expect(screen.getByText("Todo el efectivo está rendido")).toBeInTheDocument();
    expect(
      screen.getByText(/No hay cobros en efectivo en mano de las profesoras pendientes de entrega/i)
    ).toBeInTheDocument();
  });
});
