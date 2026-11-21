import { fireEvent, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ModalConfirmarAlta } from "../alta-definitiva/modal-confirmar-alta";
import { crearPendiente } from "../../__tests__/pendiente-de-prueba";
import type { FormaPrimerPago } from "@/types/alta-definitiva";

let mockEsPropietaria = true;

vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasRole: (rol: string) => (rol === "PROPIETARIA" ? mockEsPropietaria : !mockEsPropietaria),
    hasPermission: () => true,
  }),
}));

// jsdom no trae ResizeObserver y el RadioGroup de Radix lo usa para medir.
vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

function renderizar({ formas = ["EFECTIVO", "TRANSFERENCIA"] as FormaPrimerPago[], error = null as unknown } = {}) {
  const onConfirm = vi.fn();
  render(
    <ModalConfirmarAlta pendiente={crearPendiente()} formas={formas} confirmando={false} error={error} onClose={vi.fn()} onConfirm={onConfirm} />,
  );
  return { onConfirm };
}

function campo(nombre: RegExp) {
  return screen.getByLabelText(nombre);
}

function enviar() {
  fireEvent.click(screen.getByRole("button", { name: /Registrar y dar de alta|Informar transferencia/ }));
}

describe("ModalConfirmarAlta", () => {
  it("propone el precio del plan y registra el pago en efectivo", () => {
    const { onConfirm } = renderizar();

    expect(campo(/Monto cobrado/)).toHaveValue("25000");
    enviar();

    expect(onConfirm).toHaveBeenCalledWith({
      formaPago: "EFECTIVO",
      cuerpo: { id_inscripcion: 1, monto: 25000, confirmar_monto_distinto: false, id_promocion: null },
    });
  });

  it("muestra los datos de la transferencia solo al elegirla", () => {
    renderizar();
    expect(screen.queryByLabelText(/Fecha y hora/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Transferencia/ }));

    expect(campo(/Fecha y hora/)).toBeInTheDocument();
    expect(campo(/Titular de la cuenta/)).toBeInTheDocument();
  });

  it("registra una transferencia con la fecha y hora automática", () => {
    const { onConfirm } = renderizar();
    fireEvent.click(screen.getByRole("radio", { name: /Transferencia/ }));

    enviar();

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        formaPago: "TRANSFERENCIA",
        cuerpo: expect.objectContaining({
          id_inscripcion: 1,
          monto: 25000,
        }),
      }),
    );
  });

  it("pide confirmar un monto distinto del precio antes de registrarlo", () => {
    const { onConfirm } = renderizar();
    fireEvent.change(campo(/Monto cobrado/), { target: { value: "20000" } });

    enviar();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo el monto distinto" }));
    enviar();
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ cuerpo: expect.objectContaining({ monto: 20000, confirmar_monto_distinto: true }) }));
  });

  // El precio cambió desde la pre-inscripción: se muestra el mensaje del back con el esperado.
  it("ante un MONTO_DISTINTO del back muestra su mensaje y pide confirmar", () => {
    const config = { headers: new AxiosHeaders() };
    const error = new AxiosError("error", "ERR", config, null, {
      status: 409,
      statusText: "",
      data: { error: { code: "MONTO_DISTINTO", message: "El monto no coincide con el esperado (28000)." } },
      headers: {},
      config,
    });
    renderizar({ error });

    expect(screen.getByText("El monto no coincide con el esperado (28000).")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Confirmo el monto distinto" })).toBeInTheDocument();
  });

  // Sin PAGOS_CONFIRMAR la transferencia no se ofrece (pago.routes.ts).
  it("ofrece solo las formas de pago que la sesión puede registrar", () => {
    renderizar({ formas: ["EFECTIVO"] });

    expect(screen.getAllByRole("radio")).toHaveLength(1);
  });

  it("permite a una profesora informar una transferencia y ajusta textos acordemente", () => {
    mockEsPropietaria = false;
    const { onConfirm } = renderizar({ formas: ["EFECTIVO", "TRANSFERENCIA"] });

    fireEvent.click(screen.getByRole("radio", { name: /Transferencia/ }));

    expect(screen.getByText(/quedará pendiente de confirmación por la propietaria/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Informar transferencia" })).toBeInTheDocument();

    enviar();
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        formaPago: "TRANSFERENCIA",
      }),
    );
    mockEsPropietaria = true;
  });
});
