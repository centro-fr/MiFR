import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { ITEMS_PROPIETARIA, type ContadorMenu, type ItemMenu, type SubItemMenu } from "./owner-navigation";

/** Número de cada contador; sin dato (cargando o sin permiso) no se muestra. */
export type ContadoresMenu = Partial<Record<ContadorMenu, number>>;

export interface SubItemConEstado extends Omit<SubItemMenu, "contador"> {
  esActivo: boolean;
  contador?: number;
}

export interface ItemConEstado extends Omit<ItemMenu, "hijos"> {
  esActivo: boolean;
  hijos?: SubItemConEstado[];
  /** Suma de los contadores de las hijas: se ve con el grupo cerrado. */
  contador?: number;
}

export interface Miga {
  etiqueta: string;
  to?: string;
}

// La hija con la ruta más larga que contiene a la actual: en /app/alumnos/pendientes gana
// "Pendientes de alta", y en la ficha /app/alumnos/baja/3 gana "Listado", desde donde se abre.
function hijaActiva(hijos: SubItemMenu[], ruta: string): string | undefined {
  return hijos
    .filter((hijo) => esRutaDe(ruta, hijo.to))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
}

function sumar(valores: (number | undefined)[]): number | undefined {
  const conDato = valores.filter((valor): valor is number => valor !== undefined);
  return conDato.length > 0 ? conDato.reduce((total, valor) => total + valor, 0) : undefined;
}

function marcarActivo(item: ItemMenu, ruta: string, contadores: ContadoresMenu): ItemConEstado {
  if (item.hijos) {
    const activa = hijaActiva(item.hijos, ruta);
    const hijos = item.hijos.map(({ contador, ...hijo }) => ({
      ...hijo,
      esActivo: hijo.to === activa,
      contador: contador && contadores[contador],
    }));
    return { ...item, hijos, esActivo: activa !== undefined, contador: sumar(hijos.map((h) => h.contador)) };
  }
  return { ...item, hijos: undefined, esActivo: item.activo ?? (item.to !== undefined && esRutaDe(ruta, item.to)) };
}

// Las subrutas (ej: la baja /app/alumnos/baja/12) mantienen marcada la sección en el menú.
function esRutaDe(ruta: string, destino: string): boolean {
  return ruta === destino || ruta.startsWith(`${destino}/`);
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
export function useOwnerNavigation(contadores: ContadoresMenu = {}) {
  const { pathname } = useLocation();
  const pendientesDeAlta = contadores.PENDIENTES_DE_ALTA;
  return useMemo(() => {
    const items = ITEMS_PROPIETARIA.map((item) => marcarActivo(item, pathname, { PENDIENTES_DE_ALTA: pendientesDeAlta }));
    return { items, migas: construirMigas(items) };
  }, [pathname, pendientesDeAlta]);
}
