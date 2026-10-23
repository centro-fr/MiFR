import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      <PanelEfectivoARendir />
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

  it("renderiza la lista de profesoras con cobros pendientes y sus totales", () => {
    renderPanel();

    // Profesoras
    expect(screen.getByText("Lucía García")).toBeInTheDocument();
    expect(screen.getByText("Carla Ruiz")).toBeInTheDocument();

    // Alerta de más de 15 días para Lucía García (18 días)
    expect(screen.getByText("+15 días")).toBeInTheDocument();
  });

  it("inicia contraído y muestra el detalle de cobros al desplegar el acordeón", () => {
    renderPanel();

    // Por defecto el acordeón está contraído
    expect(screen.queryByText("Mateo Fernández")).not.toBeInTheDocument();

    // Desplegar acordeón de Lucía García
    const botonDesplegar = screen.getByRole("button", {
      name: /Ver cobros de Lucía García/i,
    });
    fireEvent.click(botonDesplegar);

    expect(screen.getAllByText("Mateo Fernández")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Plan Básico")[0]).toBeInTheDocument();

    // Al hacer clic en cualquier parte de la tarjeta (ej. en el nombre), se vuelve a contraer
    fireEvent.click(screen.getByText("Lucía García"));
    expect(screen.queryByText("Mateo Fernández")).not.toBeInTheDocument();

    // Y al volver a hacer clic en la tarjeta, se vuelve a desplegar
    fireEvent.click(screen.getByText("Lucía García"));
    expect(screen.getAllByText("Mateo Fernández")[0]).toBeInTheDocument();
  });

  it("abre el modal de rendición en lote al hacer clic en 'Rendir todo' y confirma", async () => {
    mockMutateRendirLote.mockResolvedValueOnce({
      rendidos: [101],
      cantidad: 1,
      total: 25000,
      salteados: [],
    });

    renderPanel();

    const botonRendirTodo = screen.getByRole("button", {
      name: /Rendir todo el efectivo de Lucía García/i,
    });
    fireEvent.click(botonRendirTodo);

    // Modal abierto
    expect(screen.getByText("Monto a rendir")).toBeInTheDocument();
    expect(screen.getByText("Observaciones (opcional)")).toBeInTheDocument();

    // Ingresar observaciones
    const inputObservaciones = screen.getByPlaceholderText(/Ej: Entregó dinero en mano/i);
    fireEvent.change(inputObservaciones, { target: { value: "Rendido en mano" } });

    // Confirmar
    const botonConfirmar = screen.getByRole("button", { name: /Confirmar rendición/i });
    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(mockMutateRendirLote).toHaveBeenCalledWith(
        {
          id_profesora: 1,
          observaciones: "Rendido en mano",
        },
        expect.anything()
      );
    });
  });

  it("abre el modal individual al hacer clic en 'Rendir' en un cobro y confirma", async () => {
    mockMutateRendirCobro.mockResolvedValueOnce({
      rendidos: [101],
      cantidad: 1,
      total: 25000,
      salteados: [],
    });

    renderPanel();

    // Desplegar primero el acordeón
    const botonDesplegar = screen.getByRole("button", {
      name: /Ver cobros de Lucía García/i,
    });
    fireEvent.click(botonDesplegar);

    const botonRendirIndividual = screen.getAllByRole("button", {
      name: /Rendir cobro de Mateo Fernández/i,
    })[0];
    fireEvent.click(botonRendirIndividual);

    // Modal individual abierto
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Rendir cobro de Mateo Fernández")).toBeInTheDocument();

    const botonConfirmar = screen.getByRole("button", { name: /Confirmar rendición/i });
    fireEvent.click(botonConfirmar);

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

    expect(screen.getByText("Sofía López")).toBeInTheDocument();
    expect(screen.getAllByText("Lucía García")[0]).toBeInTheDocument();
  });

  it("filtra por búsqueda por nombre de profesora o alumno", () => {
    renderPanel();

    const inputBuscar = screen.getByPlaceholderText(/Buscar por profesora o alumno.../i);
    fireEvent.change(inputBuscar, { target: { value: "Carla" } });

    // Carla Ruiz visible, Lucía García oculta
    expect(screen.getByText("Carla Ruiz")).toBeInTheDocument();
    expect(screen.queryByText("Lucía García")).not.toBeInTheDocument();
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
