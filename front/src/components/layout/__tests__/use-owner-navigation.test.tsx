import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useOwnerNavigation } from "@/components/layout/use-owner-navigation";

function navegacionEn(ruta: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[ruta]}>{children}</MemoryRouter>
  );
  return renderHook(() => useOwnerNavigation(), { wrapper }).result.current;
}

function alumnosActivo(ruta: string): boolean {
  return navegacionEn(ruta).items.find((item) => item.etiqueta === "Alumnos")!.esActivo;
}

describe("useOwnerNavigation: sección Alumnos", () => {
  it("marca Alumnos en el listado", () => {
    expect(alumnosActivo("/app/alumnos")).toBe(true);
  });

  // La baja se abre desde el listado: el menú no tiene sub-opción propia, pero la sección sigue marcada.
  it("mantiene marcado Alumnos dentro de la baja de un alumno", () => {
    expect(alumnosActivo("/app/alumnos/baja/3")).toBe(true);
    expect(navegacionEn("/app/alumnos/baja/3").migas.map((miga) => miga.etiqueta)).toEqual(["Inicio", "Alumnos"]);
  });

  // Un prefijo de texto no alcanza: /app/alumnos-x no es una subruta de /app/alumnos.
  it("no marca Alumnos en una ruta que solo empieza con el mismo texto", () => {
    expect(alumnosActivo("/app/alumnos-x")).toBe(false);
  });

  it("no marca Alumnos en otra sección", () => {
    expect(alumnosActivo("/app/horarios")).toBe(false);
  });
});
