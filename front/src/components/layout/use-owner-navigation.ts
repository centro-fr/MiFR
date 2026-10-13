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

// Qué tan bien una opción coincide con la ruta (0: no coincide). Su ruta, o una subruta, gana por
// largo: en /app/alumnos/pendientes gana "Pendientes de alta". `subrutasDe` cubre lo que se abre
// desde la opción sin ser su ruta (la ficha /app/alumnos/12 marca "Listado") y pierde ante una
// opción propia; la ruta exacta de `subrutasDe` es la pantalla del grupo, no de la opción.
function coincidencia(ruta: string, opcion: Pick<SubItemMenu, "to" | "subrutasDe">): number {
  if (esRutaDe(ruta, opcion.to)) return opcion.to.length;
  return opcion.subrutasDe && ruta.startsWith(`${opcion.subrutasDe}/`) ? opcion.subrutasDe.length : 0;
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

function marcarActivo(item: ItemMenu, ruta: string, contadores: ContadoresMenu): ItemConEstado {
  if (item.hijos) {
    const activa = hijaActiva(item.hijos, ruta);
    const hijos = item.hijos.map(({ contador, ...hijo }) => ({
      ...hijo,
      esActivo: hijo.to === activa,
      contador: contador && contadores[contador],
    }));
    // El grupo queda marcado en su pantalla y en todo lo que cuelga de ella (por ejemplo, la ficha).
    const enElGrupo = activa !== undefined || (item.to !== undefined && esRutaDe(ruta, item.to));
    return { ...item, hijos, esActivo: enElGrupo, contador: sumar(hijos.map((h) => h.contador)) };
  }
  return { ...item, hijos: undefined, esActivo: item.activo ?? (item.to !== undefined && coincidencia(ruta, { to: item.to, subrutasDe: item.subrutasDe }) > 0) };
}

// Las subrutas (ej: la ficha /app/alumnos/12) mantienen marcada la sección en el menú.
function esRutaDe(ruta: string, destino: string): boolean {
  return ruta === destino || ruta.startsWith(`${destino}/`);
}

function construirMigas(items: ItemConEstado[], inicio: string): Miga[] {
  const migas: Miga[] = [{ etiqueta: "Inicio", to: inicio }];
  for (const item of items) {
    if (item.hijos) {
      if (!item.esActivo) continue;
      const hijo = item.hijos.find((h) => h.esActivo);
      // El grupo enlaza a su pantalla, salvo que sea la actual.
      migas.push({ etiqueta: item.etiqueta, to: hijo ? item.to : undefined });
      if (hijo) migas.push({ etiqueta: hijo.etiqueta });
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
  // Los números por separado: el objeto de contadores es nuevo en cada render y rompería el useMemo.
  const pendientesDeAlta = contadores.PENDIENTES_DE_ALTA;
  const transferenciasPendientes = contadores.TRANSFERENCIAS_PENDIENTES;
  const menu = useMemo(() => itemsDelMenu(roles), [roles]);
  return useMemo(() => {
    const numeros: ContadoresMenu = { PENDIENTES_DE_ALTA: pendientesDeAlta, TRANSFERENCIAS_PENDIENTES: transferenciasPendientes };
    const items = menu.map((item) => marcarActivo(item, pathname, numeros));
    return { items, migas: construirMigas(items, homePathForRoles(roles)) };
  }, [menu, pathname, pendientesDeAlta, transferenciasPendientes, roles]);
}
