import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { ITEMS_PROPIETARIA, type ItemMenu, type SubItemMenu } from "./owner-navigation";

export interface SubItemConEstado extends SubItemMenu {
  esActivo: boolean;
}

export interface ItemConEstado extends Omit<ItemMenu, "hijos"> {
  esActivo: boolean;
  hijos?: SubItemConEstado[];
}

export interface Miga {
  etiqueta: string;
  to?: string;
}

function marcarActivo(item: ItemMenu, ruta: string): ItemConEstado {
  if (item.hijos) {
    const hijos = item.hijos.map((hijo) => ({ ...hijo, esActivo: ruta === hijo.to }));
    return { ...item, hijos, esActivo: hijos.some((hijo) => hijo.esActivo) };
  }
  return { ...item, hijos: undefined, esActivo: item.activo ?? (item.to !== undefined && ruta === item.to) };
}

function construirMigas(items: ItemConEstado[]): Miga[] {
  const migas: Miga[] = [{ etiqueta: "Inicio", to: "/app/dashboard" }];
  for (const item of items) {
    if (item.hijos) {
      const hijo = item.hijos.find((h) => h.esActivo);
      if (!hijo) continue;
      migas.push({ etiqueta: item.etiqueta }, { etiqueta: hijo.etiqueta });
      break;
    }
    if (item.esActivo) {
      migas.push({ etiqueta: item.etiqueta });
      break;
    }
  }
  return migas;
}

/** Ítems del menú de la propietaria con su estado activo y las migas de pan, derivados de la ruta. */
export function useOwnerNavigation() {
  const { pathname } = useLocation();
  return useMemo(() => {
    const items = ITEMS_PROPIETARIA.map((item) => marcarActivo(item, pathname));
    return { items, migas: construirMigas(items) };
  }, [pathname]);
}
