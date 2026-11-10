import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ITEMS_ALUMNO, ITEMS_PROFESORA, ITEMS_PROPIETARIA, rolesConAcceso } from "@/components/layout/owner-navigation";
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

  it("no marca Listado en otra sección", () => {
    expect(buscarItem("/app/horarios", "Listado").esActivo).toBe(false);
  });
});

describe("useOwnerNavigation: sección Cobros", () => {
  it("marca Cuotas en su ruta y en la raíz de pagos", () => {
    expect(buscarItem("/app/pagos/cuotas", "Cuotas").esActivo).toBe(true);
    expect(buscarItem("/app/pagos", "Cuotas").esActivo).toBe(true);
  });

  it("marca Transferencias por verificar en su ruta sin activar Cuotas", () => {
    expect(buscarItem("/app/pagos/transferencias", "Transferencias por verificar").esActivo).toBe(true);
    expect(buscarItem("/app/pagos/transferencias", "Cuotas").esActivo).toBe(false);
  });

  it("marca Efectivo a rendir en su ruta sin activar Cuotas", () => {
    expect(buscarItem("/app/pagos/efectivo", "Efectivo a rendir").esActivo).toBe(true);
    expect(buscarItem("/app/pagos/efectivo", "Cuotas").esActivo).toBe(false);
  });
});

describe("useOwnerNavigation: contadores", () => {
  it("pone el número de transferencias pendientes en Transferencias por verificar", () => {
    const transferencias = buscarItem("/app/dashboard", "Transferencias por verificar", {
      TRANSFERENCIAS_PENDIENTES: 3,
    });
    expect(transferencias.contador).toBe(3);
  });

  it("sin dato no hay contador", () => {
    expect(buscarItem("/app/dashboard", "Transferencias por verificar").contador).toBeUndefined();
  });
});

// US-30: la propietaria ve el ranking como pestaña de Reportes; los demás roles, en su sección Ranking.
describe("Menú: ranking de asistencia", () => {
  const rutas = (items: { to?: string }[]) => items.map((item) => item.to);

  it("la propietaria no tiene una sección aparte para el ranking", () => {
    expect(rutas(ITEMS_PROPIETARIA)).not.toContain("/app/ranking");
  });

  it("la profesora, el alumno y el tutor tienen la sección Ranking", () => {
    expect(ITEMS_PROFESORA.find((item) => item.to === "/app/ranking")?.etiqueta).toBe("Ranking");
    expect(ITEMS_ALUMNO.find((item) => item.to === "/app/ranking")?.etiqueta).toBe("Ranking");
    expect(rolesConAcceso("/app/ranking")).toEqual(["PROFESORA", "ALUMNO", "TUTOR"]);
  });
});
