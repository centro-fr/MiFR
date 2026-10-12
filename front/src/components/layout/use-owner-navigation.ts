import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { homePathForRoles, type RoleCode } from "@/types/auth";
import { itemsDelMenu, type ContadorMenu, type ItemMenu, type SubItemMenu } from "./owner-navigation";

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

// Las subrutas (ej: la ficha /app/alumnos/12) mantienen marcada la sección en el menú.
function esRutaDe(ruta: string, destino: string): boolean {
  return ruta === destino || ruta.startsWith(`${destino}/`);
}

function construirMigas(items: ItemConEstado[], inicio: string): Miga[] {
  const migas: Miga[] = [{ etiqueta: "Inicio", to: inicio }];
  for (const item of items) {
    if (item.hijos) {
      const hijo = item.hijos.find((h) => h.esActivo);
      if (!hijo) continue;
      migas.push({ etiqueta: item.etiqueta }, { etiqueta: hijo.etiqueta });
      break;
    }
    if (item.esActivo) {
      // En la pantalla de inicio del rol, "Inicio / Inicio" no aporta: queda una sola miga.
      if (item.to !== inicio) migas.push({ etiqueta: item.etiqueta });
      break;
    }
  }
  return migas;
}

// Sin roles explícitos se arma el menú de la propietaria, el único que existía antes del menú por rol.
const ROLES_POR_DEFECTO: RoleCode[] = ["PROPIETARIA"];

/** Ítems del menú de los roles de la sesión con su estado activo y las migas de pan, derivados de la ruta. */
export function useOwnerNavigation(contadores: ContadoresMenu = {}, roles: readonly RoleCode[] = ROLES_POR_DEFECTO) {
  const { pathname } = useLocation();
  const pendientesDeAlta = contadores.PENDIENTES_DE_ALTA;
  const menu = useMemo(() => itemsDelMenu(roles), [roles]);
  return useMemo(() => {
    const items = menu.map((item) => marcarActivo(item, pathname, { PENDIENTES_DE_ALTA: pendientesDeAlta }));
    return { items, migas: construirMigas(items, homePathForRoles(roles)) };
  }, [menu, pathname, pendientesDeAlta, roles]);
}
