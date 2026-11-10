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

function buscarItem(ruta: string, etiqueta: string, contadores?: ContadoresMenu, seccion?: string) {
  return navegacionEn(ruta, contadores).items.find(
    (item) => item.etiqueta === etiqueta && (seccion === undefined || item.seccion === seccion),
  )!;
}

describe("useOwnerNavigation: sección Alumnos", () => {
  it("marca Listado en su ruta", () => {
    expect(buscarItem("/app/alumnos/listado", "Listado", undefined, "Alumnos").esActivo).toBe(true);
  });

  // La ficha se abre desde el listado: mantiene marcado Listado por subrutasDe
  it("mantiene marcado Listado dentro de la ficha de un alumno", () => {
    expect(buscarItem("/app/alumnos/3", "Listado", undefined, "Alumnos").esActivo).toBe(true);
  });

  it("no marca Listado en otra sección", () => {
    expect(buscarItem("/app/horarios", "Listado", undefined, "Alumnos").esActivo).toBe(false);
  });
});

describe("useOwnerNavigation: sección Cobros", () => {
  it("marca Historial de cobros en su ruta y en la raíz de cobros", () => {
    expect(buscarItem("/app/cobros/listado", "Historial", undefined, "Cobros").esActivo).toBe(true);
    expect(buscarItem("/app/cobros", "Historial", undefined, "Cobros").esActivo).toBe(true);
  });

  it("marca Transferencias por verificar en su ruta sin activar Historial", () => {
    expect(buscarItem("/app/cobros/transferencias", "Transferencias por verificar").esActivo).toBe(true);
    expect(buscarItem("/app/cobros/transferencias", "Historial", undefined, "Cobros").esActivo).toBe(false);
  });

  it("marca Efectivo a rendir en su ruta sin activar Historial", () => {
    expect(buscarItem("/app/cobros/efectivo", "Efectivo a rendir").esActivo).toBe(true);
    expect(buscarItem("/app/cobros/efectivo", "Historial", undefined, "Cobros").esActivo).toBe(false);
  });
});

describe("useOwnerNavigation: sección Centro (Planes y Promociones)", () => {
  it("marca Promociones en su ruta sin activar Planes y genera breadcrumb coincidente", () => {
    const nav = navegacionEn("/app/planes/promociones");
    const itemPromociones = nav.items.find((i) => i.etiqueta === "Promociones")!;
    const itemPlanes = nav.items.find((i) => i.etiqueta === "Planes" && i.seccion === "Centro")!;

    expect(itemPromociones.esActivo).toBe(true);
    expect(itemPlanes.esActivo).toBe(false);

    expect(nav.migas.map((m) => m.etiqueta)).toEqual(["Inicio", "Centro", "Promociones"]);
  });

  it("marca Planes en su ruta y genera breadcrumb coincidente", () => {
    const nav = navegacionEn("/app/planes");
    const itemPlanes = nav.items.find((i) => i.etiqueta === "Planes" && i.seccion === "Centro")!;
    const itemPromociones = nav.items.find((i) => i.etiqueta === "Promociones")!;

    expect(itemPlanes.esActivo).toBe(true);
    expect(itemPromociones.esActivo).toBe(false);

    expect(nav.migas.map((m) => m.etiqueta)).toEqual(["Inicio", "Centro", "Planes"]);
  });
});

describe("useOwnerNavigation: sección Reportes", () => {
  it("marca Planes más elegidos en su ruta y genera breadcrumb coincidente", () => {
    const nav = navegacionEn("/app/reportes/planes");
    const itemPlanesReporte = nav.items.find((i) => i.etiqueta === "Planes más elegidos" && i.seccion === "Reportes")!;

    expect(itemPlanesReporte.esActivo).toBe(true);
    expect(nav.migas.map((m) => m.etiqueta)).toEqual(["Inicio", "Reportes", "Planes más elegidos"]);
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

describe("useOwnerNavigation: orden de secciones y subitems", () => {
  it("organiza las secciones en el orden: Alumnos, Cobros, Pagos, Reportes, Centro", () => {
    const nav = navegacionEn("/app/dashboard");
    const secciones = Array.from(
      new Set(nav.items.map((i) => i.seccion).filter((s): s is string => Boolean(s))),
    );
    expect(secciones).toEqual(["Alumnos", "Cobros", "Pagos", "Reportes", "Centro"]);
  });

  it("ordena Cobros como: Transferencias por verificar, Efectivo a rendir, Historial", () => {
    const nav = navegacionEn("/app/dashboard");
    const itemsCobros = nav.items.filter((i) => i.seccion === "Cobros").map((i) => i.etiqueta);
    expect(itemsCobros).toEqual(["Transferencias por verificar", "Efectivo a rendir", "Historial"]);
  });

  it("asigna Honorarios a la sección Pagos y genera su breadcrumb correspondiente", () => {
    const nav = navegacionEn("/app/honorarios");
    const itemHonorarios = nav.items.find((i) => i.etiqueta === "Honorarios")!;
    expect(itemHonorarios.seccion).toBe("Pagos");
    expect(itemHonorarios.esActivo).toBe(true);
    expect(nav.migas.map((m) => m.etiqueta)).toEqual(["Inicio", "Pagos", "Honorarios"]);
  });
});
