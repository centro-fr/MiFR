import { AxiosError, type AxiosResponse } from "axios";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Transferencia } from "@/types/transferencia";
import { ModalAprobarTransferencia } from "../modal-aprobar-transferencia";

const mockUseAlumno = vi.fn();

vi.mock("@/features/alumnos/hooks/use-alumnos", () => ({
  useAlumno: (id: number) => mockUseAlumno(id),
}));

const transferencia: Transferencia = {
  id: 10,
  estado: "PENDIENTE",
  monto: 30000,
  cargadaEl: "2026-10-12T10:00:00.000Z",
  realizadaEl: "2026-10-12T09:00:00.000Z",
  titularCuenta: null,
  observaciones: null,
  resueltaEl: null,
  motivoRechazo: null,
  alumno: { id: 7, nombre: "Valentina", apellido: "Herrera" },
  horasDesdeLaCarga: 3,
  superaPlazo: false,
};

function errorDeApi(code: string, message: string): AxiosError {
  const respuesta = { status: 409, data: { error: { code, message } } } as AxiosResponse;
  return new AxiosError(message, "ERR_BAD_REQUEST", undefined, undefined, respuesta);
}

function renderModal(props: Partial<React.ComponentProps<typeof ModalAprobarTransferencia>> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ModalAprobarTransferencia
      transferencia={transferencia}
      aprobando={false}
      error={null}
      onClose={onClose}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, onClose };
}

const botonAprobar = () => screen.getByRole("button", { name: /Sí, aprobar|Reintentar/ });

describe("ModalAprobarTransferencia (US-17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAlumno.mockReturnValue({ data: { inscripcion: { estado: "ACTIVA" } } });
  });

  it("muestra el alumno, el monto y la pregunta de confirmación", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Valentina Herrera")).toBeInTheDocument();
    expect(screen.getByText(/Se actualizará el estado del alumno a/)).toBeInTheDocument();
    expect(mockUseAlumno).toHaveBeenCalledWith(7);
  });

  it("no deja aprobar hasta marcar que se verificó el extracto bancario", () => {
    const { onConfirm } = renderModal();

    expect(botonAprobar()).toBeDisabled();
    fireEvent.click(botonAprobar());
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/Verifiqué el ingreso del dinero en mi extracto bancario/));
    expect(botonAprobar()).toBeEnabled();
  });

  it("aprueba sin confirmar monto distinto cuando el monto coincide", () => {
    const { onConfirm } = renderModal();

    fireEvent.click(screen.getByLabelText(/Verifiqué el ingreso/));
    fireEvent.click(botonAprobar());

    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it("avisa que es la primera cuota y que dispara el alta definitiva", () => {
    mockUseAlumno.mockReturnValue({ data: { inscripcion: { estado: "PREINSCRIPTA" } } });
    renderModal();

    expect(screen.getByText(/Es su primera cuota: al aprobarla se confirma el alta definitiva de Valentina/)).toBeInTheDocument();
  });

  it("no muestra el aviso de alta definitiva si el alumno ya está activo", () => {
    renderModal();

    expect(screen.queryByText(/alta definitiva/)).not.toBeInTheDocument();
  });

  it("con monto distinto pide una confirmación extra además de la verificación", () => {
    const { onConfirm } = renderModal({ error: errorDeApi("MONTO_DISTINTO", "El monto no coincide con el esperado ($35.000).") });

    expect(screen.getByRole("status")).toHaveTextContent("El monto no coincide con el esperado");

    fireEvent.click(screen.getByLabelText(/Verifiqué el ingreso/));
    expect(botonAprobar()).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Confirmo que quiero aprobarla/));
    expect(botonAprobar()).toBeEnabled();

    fireEvent.click(botonAprobar());
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("no alcanza con confirmar el monto distinto sin verificar el extracto", () => {
    renderModal({ error: errorDeApi("MONTO_DISTINTO", "El monto no coincide.") });

    fireEvent.click(screen.getByLabelText(/Confirmo que quiero aprobarla/));

    expect(botonAprobar()).toBeDisabled();
  });

  it("ante otro error avisa que no se aplicó ningún cambio y permite reintentar", () => {
    renderModal({ error: errorDeApi("INSCRIPCION_SIN_CUPO", "No hay cupo en el horario.") });

    expect(screen.getByRole("alert")).toHaveTextContent("No hay cupo en el horario.");
    expect(screen.getByRole("alert")).toHaveTextContent("La transferencia sigue pendiente: no se aplicó ningún cambio.");
    expect(screen.queryByLabelText(/Confirmo que quiero aprobarla/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("deshabilita la aprobación y la cancelación mientras aprueba", () => {
    renderModal({ aprobando: true });

    expect(screen.getByRole("button", { name: "Aprobando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("cierra con Cancelar sin aprobar", () => {
    const { onClose, onConfirm } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
