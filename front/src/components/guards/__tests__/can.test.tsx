import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Can } from "@/components/guards/can";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { crearSesion, crearUsuario } from "@/test/sesion-de-prueba";

vi.mock("@/features/auth/hooks/use-auth", () => ({ useAuth: vi.fn() }));

describe("Can", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(crearSesion(crearUsuario(["PROFESORA"], ["ASISTENCIAS_MARCAR"])));
  });

  // Botones y menús visibles para quien tiene el permiso.
  it("muestra el contenido si el usuario tiene el permiso", () => {
    render(<Can permission="ASISTENCIAS_MARCAR">Tomar asistencia</Can>);

    expect(screen.getByText("Tomar asistencia")).toBeInTheDocument();
  });

  // Regla de la spec: lo no permitido se oculta en el frontend.
  it("no muestra nada si el usuario no tiene el permiso", () => {
    const { container } = render(<Can permission="HONORARIOS_VER_TODOS">Honorarios</Can>);

    expect(container).toBeEmptyDOMElement();
  });

  // Permite mostrar una alternativa (ej. texto deshabilitado) en lugar de ocultar.
  it("muestra el fallback si el usuario no tiene el permiso", () => {
    render(
      <Can permission="HONORARIOS_VER_TODOS" fallback="Sin acceso">
        Honorarios
      </Can>,
    );

    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
    expect(screen.queryByText("Honorarios")).not.toBeInTheDocument();
  });

  // Sin sesión no hay permisos: nada protegido se renderiza.
  it("no muestra nada si no hay sesión", () => {
    vi.mocked(useAuth).mockReturnValue(crearSesion(null));

    const { container } = render(<Can permission="ASISTENCIAS_MARCAR">Tomar asistencia</Can>);

    expect(container).toBeEmptyDOMElement();
  });
});
