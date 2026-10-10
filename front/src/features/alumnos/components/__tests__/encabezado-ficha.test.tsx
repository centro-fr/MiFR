import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EncabezadoFicha } from "@/features/alumnos/components/encabezado-ficha";
import { crearFicha } from "@/features/alumnos/__tests__/ficha-de-prueba";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";

vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));

describe("EncabezadoFicha", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(crearSesion(crearUsuario(["PROPIETARIA"], ["ALUMNOS_VER", "ALUMNOS_EDITAR"])));
  });

  it("muestra nombre, estado y datos identificatorios", () => {
    render(<EncabezadoFicha onDarDeBaja={vi.fn()} alumno={crearFicha()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Martina Bianchi" })).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("38.412.985")).toBeInTheDocument();
  });

  it("no muestra el DNI cuando no está cargado", () => {
    render(<EncabezadoFicha onDarDeBaja={vi.fn()} alumno={crearFicha({ dni: null })} />);

    expect(screen.queryByText(/DNI:/)).not.toBeInTheDocument();
  });

  it("muestra el estado de baja", () => {
    render(<EncabezadoFicha onDarDeBaja={vi.fn()} alumno={crearFicha({ estado: "BAJA" })} />);

    expect(screen.getByText("De baja")).toBeInTheDocument();
  });

  // Edición, cobro y reactivación todavía no están implementados: se ven pero no se pueden usar.
  it("muestra editar y registrar cobro deshabilitados hasta que estén implementados", () => {
    render(<EncabezadoFicha onDarDeBaja={vi.fn()} alumno={crearFicha()} />);

    expect(screen.getByRole("button", { name: "Editar ficha" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Registrar cobro" })).toBeDisabled();
  });

  it("pide la baja al tocar Dar de baja", () => {
    const onDarDeBaja = vi.fn();
    render(<EncabezadoFicha onDarDeBaja={onDarDeBaja} alumno={crearFicha()} />);

    fireEvent.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(onDarDeBaja).toHaveBeenCalledOnce();
  });

  // US-08: un alumno de baja no se puede volver a dar de baja; en su lugar se ofrece reactivar.
  it("con el alumno de baja muestra la fecha y Reactivar en lugar de Dar de baja", () => {
    render(
      <EncabezadoFicha
        onDarDeBaja={vi.fn()}
        alumno={crearFicha({ estado: "BAJA", fechaBaja: "2026-06-30T18:00:00.000Z" })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reactivar" })).toBeDisabled();
    expect(screen.getByText("Baja: 30/06/2026")).toBeInTheDocument();
  });

  // El back reserva la baja a la propietaria aunque la profesora tenga ALUMNOS_EDITAR.
  it("no muestra Dar de baja a una profesora aunque pueda editar alumnos", () => {
    vi.mocked(useAuth).mockReturnValue(crearSesion(crearUsuario(["PROFESORA"], ["ALUMNOS_VER", "ALUMNOS_EDITAR"])));
    render(<EncabezadoFicha onDarDeBaja={vi.fn()} alumno={crearFicha()} />);

    expect(screen.getByRole("button", { name: "Editar ficha" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });

  it("oculta editar y dar de baja a quien no tiene ALUMNOS_EDITAR", () => {
    vi.mocked(useAuth).mockReturnValue(crearSesion(crearUsuario(["PROFESORA"], ["ALUMNOS_VER"])));
    render(<EncabezadoFicha onDarDeBaja={vi.fn()} alumno={crearFicha()} />);

    expect(screen.queryByRole("button", { name: "Editar ficha" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });
});
