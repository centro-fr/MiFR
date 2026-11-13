import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { armarBandeja } from "@/features/por-verificar/utils/bandeja";
import type { PreInscripcionPendiente } from "@/types/alta-definitiva";
import type { Transferencia } from "@/types/transferencia";
import { MemoryRouter } from "react-router-dom";
import { BandejaPorVerificar } from "../bandeja-por-verificar";

// Los modales de verificar y de cobrar tienen sus propios tests: acá alcanza con saber cuál se abre.
vi.mock("@/features/transferencias/components/modal-detalle-aprobacion", () => ({
  ModalDetalleAprobacion: ({ open, transferencia }: { open: boolean; transferencia: Transferencia | null }) =>
    open ? <div role="dialog">Verificar transferencia de {transferencia?.alumno.nombre}</div> : null,
}));
vi.mock("@/features/alumnos/components/alta-definitiva/modal-confirmar-alta", () => ({
  ModalConfirmarAlta: ({ pendiente }: { pendiente: PreInscripcionPendiente }) => (
    <div role="dialog">Cobrar el alta de {pendiente.nombre}</div>
  ),
}));
vi.mock("@/features/alumnos/hooks/use-formas-de-primer-pago", () => ({ useFormasDePrimerPago: () => ["EFECTIVO"] }));
vi.mock("@/features/promociones/hooks/use-promociones", () => ({ usePromociones: () => ({ data: [] }) }));
vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasRole: () => true, hasPermission: () => true }),
}));

const transferencia: Transferencia = {
  id: 1,
  estado: "PENDIENTE",
  monto: 42000,
  cargadaEl: "2026-10-18T12:40:00.000Z",
  realizadaEl: null,
  titularCuenta: null,
  observaciones: null,
  resueltaEl: null,
  motivoRechazo: null,
  alumno: { id: 10, nombre: "Valentina", apellido: "Herrera" },
  horasDesdeLaCarga: 1,
  superaPlazo: false,
  tipo: "RENOVACION",
  plan: "Intermedio",
};

const alta: PreInscripcionPendiente = {
  idInscripcion: "50",
  idAlumno: "20",
  nombre: "Lautaro",
  apellido: "Díaz",
  dni: null,
  email: null,
  telefono: null,
  fechaNacimiento: "2000-01-01",
  tutor: null,
  idPlan: "1",
  idPromocion: null,
  nombrePlan: "Básico",
  precio: 25000,
  profesora: "Lucía Gómez",
  horarios: [],
  fechaPreInscripcion: "2026-10-17T15:00:00.000Z",
  reserva: { vence: "2026-10-20", vencida: false },
};

function bandejaCon(items: ReturnType<typeof armarBandeja>) {
  return { items, isPending: false, isError: false, error: null, isFetching: false, refetch: vi.fn() };
}

function renderizar(bandeja: ReturnType<typeof bandejaCon>, limite?: number, variante?: "lista" | "tabla") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BandejaPorVerificar bandeja={bandeja} limite={limite} variante={variante} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BandejaPorVerificar", () => {
  it("muestra cada pendiente con su detalle, el monto y la acción que le corresponde", () => {
    renderizar(bandejaCon(armarBandeja([transferencia], [alta])));

    // En el dashboard, una fila compacta por pendiente: el detalle en una línea y el monto y la acción al lado.
    const [primera, segunda] = within(screen.getByRole("list", { name: "Pagos por verificar" })).getAllByRole("listitem");
    expect(primera).toHaveTextContent("Valentina Herrera");
    expect(primera).toHaveTextContent("Transferencia · Intermedio · Renovación · 18/10 09:40");
    expect(primera).toHaveTextContent("42.000");
    expect(within(primera).getByRole("button", { name: "Verificar: Valentina Herrera" })).toBeInTheDocument();
    expect(segunda).toHaveTextContent("Alta nueva · Básico · reserva hasta el 20/10");
    expect(within(segunda).getByRole("button", { name: "Cobrar: Lautaro Díaz" })).toBeInTheDocument();
  });

  it("Verificar abre la transferencia y Cobrar abre el alta", () => {
    renderizar(bandejaCon(armarBandeja([transferencia], [alta])));

    fireEvent.click(screen.getByRole("button", { name: "Verificar: Valentina Herrera" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Verificar transferencia de Valentina");

    fireEvent.click(screen.getByRole("button", { name: "Cobrar: Lautaro Díaz" }));
    expect(screen.getByText("Cobrar el alta de Lautaro")).toBeInTheDocument();
  });

  it("en el dashboard muestra solo las primeras", () => {
    renderizar(bandejaCon(armarBandeja([transferencia], [alta])), 1);

    expect(within(screen.getByRole("list", { name: "Pagos por verificar" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("en la pantalla Por verificar arma una tabla con el plan, la cuota y la fecha en columnas", () => {
    renderizar(bandejaCon(armarBandeja([transferencia], [alta])), undefined, "tabla");

    const tabla = screen.getByRole("table");
    const encabezados = within(tabla).getAllByRole("columnheader").map((celda) => celda.textContent);
    expect(encabezados).toEqual(["Alumno", "A verificar", "Plan", "Cuota", "Fecha", "Monto", "Acciones"]);
    const [, transferenciaFila, altaFila] = within(tabla).getAllByRole("row");
    expect(within(transferenciaFila).getAllByRole("cell").map((celda) => celda.textContent).slice(1, 5)).toEqual([
      "Transferencia",
      "Intermedio",
      "Renovación",
      "18/10 09:40",
    ]);
    expect(within(altaFila).getAllByRole("cell").map((celda) => celda.textContent).slice(1, 5)).toEqual([
      "Alta nueva",
      "Básico",
      "Primera cuota",
      "reserva hasta el 20/10",
    ]);
  });

  it("avisa cuando no hay nada por verificar", () => {
    renderizar(bandejaCon([]));

    expect(screen.getByText("No hay pagos por verificar.")).toBeInTheDocument();
  });
});
