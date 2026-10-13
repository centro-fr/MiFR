import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendientesDeAltaPage } from "../pendientes-de-alta-page";
import { useConfirmarAltaDefinitiva, usePreInscripcionesPendientes } from "../../hooks/use-alta-definitiva";
import { crearPendiente } from "../../__tests__/pendiente-de-prueba";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";

vi.mock("@/components/layout/owner-layout", () => ({
  OwnerLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("../../hooks/use-alta-definitiva", () => ({
  usePreInscripcionesPendientes: vi.fn(),
  useConfirmarAltaDefinitiva: vi.fn(),
}));

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

type ResultadoLista = ReturnType<typeof usePreInscripcionesPendientes>;

function simularLista(resultado: Partial<ResultadoLista>) {
  vi.mocked(usePreInscripcionesPendientes).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
    ...resultado,
  } as ResultadoLista);
}

function iniciarSesion(permisos: string[]) {
  vi.mocked(useAuth).mockReturnValue(crearSesion(crearUsuario(["PROPIETARIA"], ["ALUMNOS_VER", ...permisos])));
}

function renderizar() {
  render(
    <MemoryRouter>
      <PendientesDeAltaPage />
    </MemoryRouter>,
  );
}

const MATEO = crearPendiente({
  idInscripcion: "2",
  idAlumno: "2",
  nombre: "Mateo",
  apellido: "Romero",
  fechaNacimiento: "2015-11-03",
  email: null,
  telefono: null,
  tutor: { nombre: "Paula", apellido: "Romero", telefono: "351 555-0101" },
});

function tabla() {
  return within(screen.getByRole("table"));
}

describe("PendientesDeAltaPage", () => {
  beforeEach(() => {
    iniciarSesion(["PAGOS_REGISTRAR", "PAGOS_CONFIRMAR"]);
    vi.mocked(useConfirmarAltaDefinitiva).mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useConfirmarAltaDefinitiva>);
  });

  it("muestra un estado de carga mientras llegan las pre-inscripciones", () => {
    simularLista({ isPending: true });
    renderizar();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando pre-inscripciones pendientes…");
  });

  it("lista las pendientes con su plan, profesora y horario", () => {
    simularLista({ data: [crearPendiente(), MATEO] });
    renderizar();

    expect(screen.getByText("2 pendientes")).toBeInTheDocument();
    const fila = within(tabla().getByRole("rowheader", { name: /Sofía Medina/ }).closest("tr")!);
    expect(fila.getByText("Básico")).toBeInTheDocument();
    expect(fila.getByText("Lucía Gómez")).toBeInTheDocument();
    expect(fila.getByText("Lun y Mié 18:00 a 19:00")).toBeInTheDocument();
  });

  // Un menor entra al sistema con su tutor/a: se lo nombra y se usa su teléfono de contacto.
  it("muestra el tutor y su teléfono para un menor", () => {
    simularLista({ data: [MATEO] });
    renderizar();

    expect(tabla().getByText(/Tutor\/a: Paula Romero/)).toBeInTheDocument();
    expect(tabla().getByText("Tel. del tutor/a")).toBeInTheDocument();
  });

  it("filtra por la búsqueda", () => {
    simularLista({ data: [crearPendiente(), MATEO] });
    renderizar();

    fireEvent.change(screen.getByRole("searchbox", { name: /Buscar/ }), { target: { value: "mateo" } });

    expect(tabla().queryByText("Sofía Medina")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 1 de 2 pre-inscripciones")).toBeInTheDocument();
  });

  it("muestra un estado vacío si no hay pendientes", () => {
    simularLista({ data: [] });
    renderizar();

    expect(screen.getByRole("heading", { name: "No hay pre-inscripciones pendientes" })).toBeInTheDocument();
  });

  it("abre el registro del primer pago desde Confirmar alta", () => {
    simularLista({ data: [crearPendiente()] });
    renderizar();

    fireEvent.click(tabla().getByRole("button", { name: "Confirmar alta de Sofía Medina" }));

    expect(screen.getByRole("dialog", { name: "Confirmar alta de Sofía Medina" })).toBeInTheDocument();
  });

  it("enlaza a la ficha de cada alumno", () => {
    simularLista({ data: [crearPendiente()] });
    renderizar();

    expect(tabla().getByRole("link", { name: "Ver ficha de Sofía Medina" })).toHaveAttribute("href", "/app/alumnos/1");
  });

  it("sin permisos de cobro no ofrece confirmar el alta", () => {
    iniciarSesion([]);
    simularLista({ data: [crearPendiente()] });
    renderizar();

    expect(screen.queryByRole("button", { name: /Confirmar alta/ })).not.toBeInTheDocument();
  });
});
