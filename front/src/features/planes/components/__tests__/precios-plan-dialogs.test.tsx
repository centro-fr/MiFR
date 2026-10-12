import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ActualizarPrecioDialog,
  HistorialPreciosDialog,
} from "@/features/planes/components/precios-plan-dialogs";
import type { Plan } from "@/types/plan";

const { registrarPrecio, consultarPrecios } = vi.hoisted(() => ({
  registrarPrecio: vi.fn(),
  consultarPrecios: vi.fn(),
}));

vi.mock("@/features/planes/hooks/use-planes", () => ({
  usePreciosPlan: consultarPrecios,
  useRegistrarPrecioPlan: () => ({
    mutateAsync: registrarPrecio,
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  }),
}));

const PLAN: Plan = {
  id: "1",
  nombre: "Plan Básico",
  descripcion: null,
  tipo: "MENSUAL",
  clasesPorSemana: 2,
  diasGracia: 5,
  actividad: null,
  profesoraUnica: false,
  precioVigente: 25000,
  precioVigenteDesde: "2026-01-01T00:00:00.000Z",
  precioProgramado: null,
  fechaBaja: null,
};

describe("ActualizarPrecioDialog", () => {
  beforeEach(() => {
    registrarPrecio.mockReset();
    consultarPrecios.mockReturnValue({
      data: [],
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("muestra el error y no confirma un precio cero", async () => {
    render(<ActualizarPrecioDialog plan={PLAN} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nuevo arancel (ARS) *"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar y confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ingresá un precio mayor a $0.");
    expect(registrarPrecio).not.toHaveBeenCalled();
  });

  it("pide confirmación y envía el nuevo importe y su vigencia", async () => {
    const onClose = vi.fn();
    registrarPrecio.mockResolvedValue({});
    render(<ActualizarPrecioDialog plan={PLAN} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Nuevo arancel (ARS) *"), { target: { value: "32.000" } });
    const fecha = (screen.getByLabelText("Fecha de vigencia *") as HTMLInputElement).value;
    fireEvent.click(screen.getByRole("button", { name: "Revisar y confirmar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar actualización" }));

    await waitFor(() =>
      expect(registrarPrecio).toHaveBeenCalledWith({
        id: PLAN.id,
        cuerpo: { precio: 32000, fecha_vigencia_desde: fecha },
      }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("identifica como vigente el precio que empieza hoy", async () => {
    const hoy = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter((parte) => ["year", "month", "day"].includes(parte.type))
      .map((parte) => parte.value)
      .join("-");
    consultarPrecios.mockReturnValue({
      data: [
        {
          id_plan_precio: 1,
          id_plan: 1,
          precio: 28000,
          fecha_vigencia_desde: `${hoy}T00:00:00.000Z`,
          fecha_vigencia_hasta: null,
        },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<HistorialPreciosDialog plan={PLAN} onClose={vi.fn()} />);

    expect(await screen.findByText("Vigente")).toBeInTheDocument();
  });
});
