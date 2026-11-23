import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoleCode } from "@/types/auth";
import { OwnerLayout } from "../owner-layout";

let rolesMock: RoleCode[] = ["PROPIETARIA"];

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { nombre: "Frida", apellido: "Kahlo", email: "frida@mifr.com" },
    logout: vi.fn(),
  }),
}));

vi.mock("@/features/seguridad/hooks/use-permissions", () => ({
  usePermissions: () => ({
    roles: rolesMock,
    hasPermission: () => true,
    hasRole: (rol: RoleCode) => rolesMock.includes(rol),
  }),
}));

vi.mock("@/features/notificaciones/components/campana-notificaciones", () => ({
  CampanaNotificaciones: () => <div data-testid="campana" />,
}));

vi.mock("../use-contadores-menu", () => ({
  useContadoresMenu: () => ({}),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("OwnerLayout: migas de pan y submiga", () => {
  beforeEach(() => {
    rolesMock = ["PROPIETARIA"];
  });

  it("cuando se pasa submiga en la ficha del alumno como propietaria, omite la sección Alumnos y muestra Listado y el nombre del alumno", () => {
    render(
      <MemoryRouter initialEntries={["/app/alumnos/5"]}>
        <OwnerLayout submiga="Sofía Medina">
          <div>Contenido de prueba</div>
        </OwnerLayout>
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(nav).toBeInTheDocument();

    // Debe contener Inicio, Listado y Sofía Medina, pero NO la sección Alumnos
    expect(nav).toHaveTextContent("Inicio");
    expect(nav).toHaveTextContent("Listado");
    expect(nav).toHaveTextContent("Sofía Medina");
    expect(nav).not.toHaveTextContent("Alumnos");
  });

  it("cuando se pasa submiga en la ficha del alumno como profesora, conserva Alumnos con enlace al listado", () => {
    rolesMock = ["PROFESORA"];

    render(
      <MemoryRouter initialEntries={["/app/alumnos/5"]}>
        <OwnerLayout submiga="Sofía Medina">
          <div>Contenido de prueba</div>
        </OwnerLayout>
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(nav).toHaveTextContent("Inicio");
    expect(nav).toHaveTextContent("Alumnos");
    expect(nav).toHaveTextContent("Sofía Medina");
    expect(within(nav).getByRole("link", { name: "Alumnos" })).toHaveAttribute("href", "/app/alumnos/listado");
  });

  it("restaura la posición de scroll del sidebar desde sessionStorage", () => {
    sessionStorage.setItem("sidebar_scroll_position", "180");

    render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <OwnerLayout>
          <div>Contenido</div>
        </OwnerLayout>
      </MemoryRouter>,
    );

    const sidebarContent = document.querySelector('[data-sidebar="content"]') as HTMLElement;
    expect(sidebarContent).toBeInTheDocument();
    expect(sidebarContent.scrollTop).toBe(180);
  });

  it("renderiza el botón de colapsar menú (SidebarTrigger) en la cabecera superior", () => {
    render(
      <MemoryRouter initialEntries={["/app/inicio"]}>
        <OwnerLayout>
          <div>Contenido</div>
        </OwnerLayout>
      </MemoryRouter>,
    );

    const trigger = document.querySelector('[data-sidebar="trigger"]');
    expect(trigger).toBeInTheDocument();
  });
});
