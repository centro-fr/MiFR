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

export interface ItemConEstado extends Omit<ItemMenu, "hijos" | "contador"> {
  esActivo: boolean;
  hijos?: SubItemConEstado[];
  /** Suma de los contadores de las hijas: se ve con el grupo cerrado, o del propio ítem. */
  contador?: number;
}

export interface Miga {
  etiqueta: string;
  to?: string;
}

function coincidencia(
  ruta: string,
  opcion: Pick<SubItemMenu, "to" | "subrutasDe">,
  rutasDeOtrosItems: string[] = [],
): number {
  if (esRutaDe(ruta, opcion.to)) {
    if (rutasDeOtrosItems.some((otra) => otra.length > opcion.to.length && esRutaDe(ruta, otra))) {
      return 0;
    }
    return opcion.to.length;
  }
  if (opcion.subrutasDe && esRutaDe(ruta, opcion.subrutasDe)) {
    if (rutasDeOtrosItems.some((otra) => esRutaDe(ruta, otra))) {
      return 0;
    }
    return opcion.subrutasDe.length;
  }
  return 0;
}

function hijaActiva(hijos: SubItemMenu[], ruta: string): string | undefined {
  return hijos
    .map((hijo) => ({ to: hijo.to, puntaje: coincidencia(ruta, hijo) }))
    .filter(({ puntaje }) => puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)[0]?.to;
}

function sumar(valores: (number | undefined)[]): number | undefined {
  const conDato = valores.filter((valor): valor is number => valor !== undefined);
  return conDato.length > 0 ? conDato.reduce((total, valor) => total + valor, 0) : undefined;
}

function marcarActivo(
  item: ItemMenu,
  ruta: string,
  contadores: ContadoresMenu,
  rutasDeOtrosItems: string[] = [],
): ItemConEstado {
  if (item.hijos) {
    const activa = hijaActiva(item.hijos, ruta);
    const hijos = item.hijos.map(({ contador, ...hijo }) => ({
      ...hijo,
      esActivo: hijo.to === activa,
      contador: contador && contadores[contador],
    }));
    const enElGrupo = activa !== undefined || (item.to !== undefined && esRutaDe(ruta, item.to));
    return { ...item, hijos, esActivo: enElGrupo, contador: sumar(hijos.map((h) => h.contador)) };
  }
  return {
    ...item,
    hijos: undefined,
    esActivo:
      item.activo ??
      (item.to !== undefined && coincidencia(ruta, { to: item.to, subrutasDe: item.subrutasDe }, rutasDeOtrosItems) > 0),
    contador: item.contador ? contadores[item.contador] : undefined,
  };
}

function esRutaDe(ruta: string, destino: string): boolean {
  return ruta === destino || ruta.startsWith(`${destino}/`);
}

function construirMigas(items: ItemConEstado[], inicio: string, ruta?: string): Miga[] {
  const migas: Miga[] = [{ etiqueta: "Inicio", to: inicio }];
  for (const item of items) {
    if (item.hijos) {
      if (!item.esActivo) continue;
      const hijo = item.hijos.find((h) => h.esActivo);
      migas.push({ etiqueta: item.etiqueta, to: hijo ? item.to : undefined });
      if (hijo) migas.push({ etiqueta: hijo.etiqueta });
      break;
    }
    if (item.esActivo) {
      if (item.to !== inicio) {
        if (item.seccion) {
          migas.push({ etiqueta: item.seccion });
        }
        const esSubruta = Boolean(
          ruta && item.to && ruta !== item.to && ruta !== item.subrutasDe && ruta.startsWith(item.subrutasDe ?? item.to),
        );
        migas.push({ etiqueta: item.etiqueta, to: esSubruta ? item.to : undefined });
      }
      break;
    }
  }
  return migas;
}

const ROLES_POR_DEFECTO: RoleCode[] = ["PROPIETARIA"];

/** Ítems del menú con soporte para rolActivo */
export function useOwnerNavigation(
  contadores: ContadoresMenu = {},
  roles: readonly RoleCode[] = ROLES_POR_DEFECTO,
  rolActivo?: RoleCode,
) {
  const { pathname } = useLocation();
  const pendientesDeAlta = contadores.PENDIENTES_DE_ALTA;
  const transferenciasPendientes = contadores.TRANSFERENCIAS_PENDIENTES;
  const menu = useMemo(() => itemsDelMenu(roles, rolActivo), [roles, rolActivo]);
  return useMemo(() => {
    const numeros: ContadoresMenu = { PENDIENTES_DE_ALTA: pendientesDeAlta, TRANSFERENCIAS_PENDIENTES: transferenciasPendientes };
    const todasLasRutas = menu
      .flatMap((i) => [i.to, ...(i.hijos?.map((h) => h.to) ?? [])])
      .filter((t): t is string => Boolean(t));
    const items = menu.map((item) =>
      marcarActivo(
        item,
        pathname,
        numeros,
        todasLasRutas.filter((r) => r !== item.to),
      ),
    );
    const rutaInicio = rolActivo ? homePathForRoles([rolActivo]) : homePathForRoles(roles);
    return { items, migas: construirMigas(items, rutaInicio, pathname) };
  }, [menu, pathname, pendientesDeAlta, transferenciasPendientes, roles, rolActivo]);
}
