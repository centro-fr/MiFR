import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useOwnerNavigation, type ContadoresMenu } from "@/components/layout/use-owner-navigation";

function navegacionEn(ruta: string, contadores: ContadoresMenu = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[ruta]}>{children}</MemoryRouter>
  );
  return renderHook(() => useOwnerNavigation(contadores), { wrapper }).result.current;
}

function grupoAlumnos(ruta: string, contadores?: ContadoresMenu) {
  return navegacionEn(ruta, contadores).items.find((item) => item.etiqueta === "Alumnos")!;
}

function alumnosActivo(ruta: string): boolean {
  return grupoAlumnos(ruta).esActivo;
}

function subOpcionActiva(ruta: string): string | undefined {
  return grupoAlumnos(ruta).hijos!.find((hijo) => hijo.esActivo)?.etiqueta;
}

describe("useOwnerNavigation: sección Alumnos", () => {
  it("marca Alumnos en el listado", () => {
    expect(alumnosActivo("/app/alumnos/listado")).toBe(true);
  });

  it("marca la sub-opción Listado en el listado", () => {
    expect(subOpcionActiva("/app/alumnos/listado")).toBe("Listado");
  });

  // La ficha (US-08) se abre desde el listado: no tiene sub-opción propia y queda marcado Listado.
  it("mantiene marcado Listado dentro de la ficha de un alumno", () => {
    expect(subOpcionActiva("/app/alumnos/baja/3")).toBe("Listado");
    expect(navegacionEn("/app/alumnos/baja/3").migas.map((miga) => miga.etiqueta)).toEqual(["Inicio", "Alumnos", "Listado"]);
  });

  // /app/alumnos/pendientes también está "dentro" de /app/alumnos: gana la ruta más específica.
  it("marca solo Pendientes de alta en su pantalla", () => {
    expect(subOpcionActiva("/app/alumnos/pendientes")).toBe("Pendientes de alta");
  });

  // Un prefijo de texto no alcanza: /app/alumnos-x no es una subruta de /app/alumnos.
  it("no marca Alumnos en una ruta que solo empieza con el mismo texto", () => {
    expect(alumnosActivo("/app/alumnos-x")).toBe(false);
  });

  it("no marca Alumnos en otra sección", () => {
    expect(alumnosActivo("/app/horarios")).toBe(false);
  });
});

describe("useOwnerNavigation: contadores", () => {
  it("pone el número de pendientes en su sub-opción y en el grupo", () => {
    const alumnos = grupoAlumnos("/app/dashboard", { PENDIENTES_DE_ALTA: 2 });

    expect(alumnos.hijos!.find((hijo) => hijo.etiqueta === "Pendientes de alta")!.contador).toBe(2);
    expect(alumnos.contador).toBe(2);
  });

  // Mientras carga o sin permiso no hay número: no se muestra un 0 engañoso.
  it("sin dato no hay contador", () => {
    expect(grupoAlumnos("/app/dashboard").contador).toBeUndefined();
  });
});
