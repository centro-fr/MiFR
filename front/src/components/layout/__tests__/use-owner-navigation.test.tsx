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

function buscarItem(ruta: string, etiqueta: string, contadores?: ContadoresMenu) {
  return navegacionEn(ruta, contadores).items.find((item) => item.etiqueta === etiqueta)!;
}

describe("useOwnerNavigation: sección Alumnos", () => {
  it("marca Listado en su ruta", () => {
    expect(buscarItem("/app/alumnos/listado", "Listado").esActivo).toBe(true);
  });

  // La ficha se abre desde el listado: mantiene marcado Listado por subrutasDe
  it("mantiene marcado Listado dentro de la ficha de un alumno", () => {
    expect(buscarItem("/app/alumnos/3", "Listado").esActivo).toBe(true);
  });

  it("marca Ausentes en su ruta", () => {
    expect(buscarItem("/app/ausentes", "Ausentes").esActivo).toBe(true);
  });

  it("marca Cobros y Cuotas en su ruta", () => {
    expect(buscarItem("/app/pagos", "Cobros y Cuotas").esActivo).toBe(true);
  });

  it("no marca Listado en otra sección", () => {
    expect(buscarItem("/app/horarios", "Listado").esActivo).toBe(false);
  });
});

describe("useOwnerNavigation: contadores", () => {
  it("pone el número de transferencias pendientes en Cobros y Cuotas", () => {
    const cobros = buscarItem("/app/dashboard", "Cobros y Cuotas", { TRANSFERENCIAS_PENDIENTES: 3 });
    expect(cobros.contador).toBe(3);
  });

  it("sin dato no hay contador", () => {
    expect(buscarItem("/app/dashboard", "Cobros y Cuotas").contador).toBeUndefined();
  });
});
