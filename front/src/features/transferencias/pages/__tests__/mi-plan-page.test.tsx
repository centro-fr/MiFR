import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MiPlanPage } from "../mi-plan-page";
import * as hooks from "../../hooks/use-transferencias";
import type { MiPlanRespuesta, TransferenciaApi } from "../../schemas/transferencia";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

const mockPlanData: MiPlanRespuesta = {
  alumno: {
    id_alumno: 1,
    nombre: "Camila",
    apellido: "Pérez",
    dni: "35123456",
  },
  inscripcion: {
    id_inscripcion: 1,
    id_plan: 1,
    nombre_plan: "Plan Básico",
    estado: "ACTIVA",
    precio: 25000,
    clases_por_semana: 2,
    nombre_profesora: "Lucía Gómez",
  },
  situacion_cuota: {
    estado: "AL_DIA",
    fecha_vencimiento: "2026-10-25",
    dias_restantes: 12,
    puede_asistir: true,
    monto: 25000,
    tiene_transferencia_pendiente: false,
    transferencia_pendiente: null,
  },
  datos_bancarios: {
    banco: "Banco Santander Río",
    cbu: "0720123488000012345678",
    alias: "MIFR.CENTRO.FIT",
    titular: "MiFR Entrenamiento Integral S.R.L.",
    cuit: "30-71234567-9",
  },
};

const mockTransferencias: TransferenciaApi[] = [
  {
    id_pago: 101,
    id_cuota: 1,
    id_inscripcion: 1,
    forma_pago: "TRANSFERENCIA",
    estado: "CONFIRMADO",
    monto: 25000,
    fecha_pago: "2026-09-25T14:00:00Z",
    fecha_hora_transferencia: "2026-09-25T13:30:00-03:00",
    titular_cuenta_origen: null,
    observaciones: null,
    motivo_rechazo: null,
    alumno: {
      id_alumno: 1,
      nombre: "Camila",
      apellido: "Pérez",
    },
  },
];

function renderMiPlanPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MiPlanPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MiPlanPage (US-16)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(hooks, "useMiPlan").mockReturnValue({
      data: mockPlanData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof hooks.useMiPlan>);

    vi.spyOn(hooks, "useMisTransferencias").mockReturnValue({
      data: mockTransferencias,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof hooks.useMisTransferencias>);

    vi.spyOn(hooks, "useInformarTransferencia").mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id_pago: 102 }),
      isPending: false,
    } as unknown as ReturnType<typeof hooks.useInformarTransferencia>);
  });

  it("renderiza la pantalla de Mi plan y transferencias con los datos del centro", () => {
    renderMiPlanPage();

    expect(screen.getByRole("heading", { name: "Mi plan y transferencias" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Historial de pagos" })).toBeInTheDocument();
    expect(screen.getByText("1 pago")).toBeInTheDocument();
    expect(screen.getAllByText("Plan Básico").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("MIFR.CENTRO.FIT")).toBeInTheDocument();
    expect(screen.getByText("0720123488000012345678")).toBeInTheDocument();
    expect(screen.getAllByText("Verificada").length).toBeGreaterThanOrEqual(1);
  });

  it("muestra la indicación para avisar a la administración o profesor/a tras transferir", () => {
    renderMiPlanPage();

    expect(
      screen.getByText(/avisale a la administración o a tu profesor\/a/i),
    ).toBeInTheDocument();
  });

  it("muestra la alerta destacada cuando hay una transferencia en estado PENDIENTE", () => {
    const planConPendiente: MiPlanRespuesta = {
      ...mockPlanData,
      situacion_cuota: {
        ...mockPlanData.situacion_cuota!,
        tiene_transferencia_pendiente: true,
        transferencia_pendiente: {
          id_pago: 102,
          monto: 25000,
          fecha_hora_transferencia: "2026-10-12T10:00:00-03:00",
          fecha_pago: "2026-10-12T10:05:00Z",
        },
      },
    };

    vi.spyOn(hooks, "useMiPlan").mockReturnValue({
      data: planConPendiente,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof hooks.useMiPlan>);

    renderMiPlanPage();

    expect(screen.getByRole("status", { name: /Aviso de transferencia pendiente de verificación/i })).toBeInTheDocument();
    expect(screen.getByText(/Podés continuar asistiendo a clases normalmente mientras tanto/i)).toBeInTheDocument();
  });
});
