import {
  Banknote,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Dumbbell,
  GraduationCap,
  House,
  LayoutDashboard,
  Presentation,
  Receipt,
  Tag,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  UserX,
} from "lucide-react";
import type { RoleCode } from "@/types/auth";

/** Contadores que puede mostrar una sub-opción; el número lo resuelve el layout. */
export type ContadorMenu = "PENDIENTES_DE_ALTA" | "TRANSFERENCIAS_PENDIENTES";

export interface SubItemMenu {
  etiqueta: string;
  to: string;
  contador?: ContadorMenu;
  /** Tarjeta de la pantalla del grupo: ícono y qué se hace ahí. */
  icono?: typeof LayoutDashboard;
  descripcion?: string;
  subrutasDe?: string;
}

export interface ItemMenu {
  etiqueta: string;
  icono: typeof LayoutDashboard;
  /**
   * Título de la sección del menú en la que va el ítem. Los ítems seguidos con la misma sección se
   * muestran juntos bajo ese título; sin sección, van arriba de todo sin título (ej: Dashboard).
   */
  seccion?: string;
  /** En un grupo, su pantalla: muestra las sub-opciones como tarjetas (otra forma de llegar a ellas). */
  to?: string;
  activo?: boolean;
  descripcion?: string;
  subrutasDe?: string;
  contador?: ContadorMenu;
  /** Si tiene hijos, el ítem es un grupo desplegable. */
  hijos?: SubItemMenu[];
}

const SUBRUTAS_DE_ALUMNOS = "/app/alumnos";

// Secciones de la navegación según diseño (ALUMNOS, CLASES, CENTRO)
const SECCION_ALUMNOS = "Alumnos";
const SECCION_CLASES = "Clases";
const SECCION_CENTRO = "Centro";

export const ITEMS_PROPIETARIA: ItemMenu[] = [
  { etiqueta: "Dashboard", icono: LayoutDashboard, to: "/app/dashboard" },
  {
    etiqueta: "Listado",
    icono: Users,
    seccion: SECCION_ALUMNOS,
    to: "/app/alumnos/listado",
    descripcion: "Buscar alumnos, ver su ficha y su estado de cuota.",
    subrutasDe: SUBRUTAS_DE_ALUMNOS,
  },
  {
    etiqueta: "Ausentes",
    icono: UserX,
    seccion: SECCION_ALUMNOS,
    to: "/app/ausentes",
    descripcion: "Detección y seguimiento de alumnos ausentes.",
  },
  {
    etiqueta: "Cobros y Cuotas",
    icono: Banknote,
    seccion: SECCION_ALUMNOS,
    to: "/app/pagos",
    contador: "TRANSFERENCIAS_PENDIENTES",
    subrutasDe: "/app/pagos",
    descripcion: "Quién debe, qué transferencias faltan verificar y cuánto efectivo te tienen que rendir.",
  },
  { etiqueta: "Profesores", icono: GraduationCap, seccion: SECCION_CLASES, to: "/app/profesoras", subrutasDe: "/app/profesoras", descripcion: "Plantel de profesores, especialidades y staff." },
  { etiqueta: "Actividades", icono: Dumbbell, seccion: SECCION_CLASES, to: "/app/actividades" },
  { etiqueta: "Horarios", icono: CalendarDays, seccion: SECCION_CLASES, to: "/app/horarios" },
  { etiqueta: "Planes y Precios", icono: Tag, seccion: SECCION_CLASES, to: "/app/planes" },
  { etiqueta: "Honorarios", icono: Receipt, seccion: SECCION_CENTRO, to: "/app/honorarios" },
  { etiqueta: "Reportes", icono: BarChart3, seccion: SECCION_CENTRO, to: "/app/reportes" },
];

const PERFIL: ItemMenu = { etiqueta: "Perfil", icono: UserRound, to: "/app/perfil" };

const CLASES_PROFESORA: ItemMenu[] = [
  { etiqueta: "Hoy", icono: CalendarClock, to: "/app/hoy", descripcion: "Las clases del día y la toma de asistencia." },
  { etiqueta: "Mis clases", icono: BookOpen, to: "/app/mis-clases", descripcion: "El historial de tus clases y sus asistencias." },
];

export const ITEMS_PROFESORA: ItemMenu[] = [
  ...CLASES_PROFESORA,
  { etiqueta: "Alumnos", icono: Users, to: "/app/alumnos/listado", subrutasDe: SUBRUTAS_DE_ALUMNOS },
  { etiqueta: "Cobros", icono: Banknote, to: "/app/cobros" },
  { etiqueta: "Ranking", icono: Trophy, to: "/app/ranking" },
  PERFIL,
];

const PANEL_ALUMNO: ItemMenu[] = [
  { etiqueta: "Inicio", icono: House, to: "/app/inicio" },
  { etiqueta: "Mi plan", icono: CreditCard, to: "/app/mi-plan" },
  { etiqueta: "Progreso", icono: TrendingUp, to: "/app/progreso" },
  { etiqueta: "Ranking", icono: Trophy, to: "/app/ranking" },
];

export const ITEMS_ALUMNO: ItemMenu[] = [...PANEL_ALUMNO, PERFIL];

const MENU_POR_ROL: Record<RoleCode, ItemMenu[]> = {
  PROPIETARIA: ITEMS_PROPIETARIA,
  PROFESORA: ITEMS_PROFESORA,
  ALUMNO: ITEMS_ALUMNO,
  TUTOR: ITEMS_ALUMNO,
};

function ofreceLaRuta(item: ItemMenu, ruta: string): boolean {
  return item.to === ruta || (item.hijos?.some((hijo) => hijo.to === ruta) ?? false);
}

const ROLES_POR_ALCANCE: RoleCode[] = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];

/** Paneles entre los que alterna con el switch quien es propietaria y profesora. */
export type Panel = Extract<RoleCode, "PROPIETARIA" | "PROFESORA">;
const PANELES: Panel[] = ["PROPIETARIA", "PROFESORA"];

export function rolPrincipal(tieneElRol: (rol: RoleCode) => boolean): RoleCode | undefined {
  return ROLES_POR_ALCANCE.find(tieneElRol);
}

function esRutaDe(ruta: string, destino: string | undefined): boolean {
  return destino !== undefined && (ruta === destino || ruta.startsWith(`${destino}/`));
}

function ofreceLaPantalla(item: ItemMenu, ruta: string): boolean {
  const opciones = [item, ...(item.hijos ?? [])];
  return opciones.some((opcion) => esRutaDe(ruta, opcion.to) || esRutaDe(ruta, opcion.subrutasDe));
}

/**
 * El único panel cuyo menú ofrece la pantalla, o null si la ofrecen los dos (Alumnos y su ficha) o
 * ninguno (Notificaciones): en esas, el panel lo decide desde cuál se llegó.
 */
export function panelExclusivoDeLaRuta(ruta: string): Panel | null {
  const paneles = PANELES.filter((panel) => MENU_POR_ROL[panel].some((item) => ofreceLaPantalla(item, ruta)));
  return paneles.length === 1 ? paneles[0] : null;
}

const GRUPO_DEL_ROL: Record<RoleCode, Pick<ItemMenu, "etiqueta" | "icono" | "to" | "descripcion"> & { items: ItemMenu[] }> = {
  PROPIETARIA: { etiqueta: "Propietaria", icono: LayoutDashboard, items: ITEMS_PROPIETARIA },
  PROFESORA: {
    etiqueta: "Profesor/a",
    icono: Presentation,
    to: "/app/profesora",
    descripcion: "Tus clases como profesor/a: las de hoy y su historial.",
    items: CLASES_PROFESORA,
  },
  ALUMNO: { etiqueta: "Alumno", icono: GraduationCap, items: PANEL_ALUMNO },
  TUTOR: { etiqueta: "Tutor", icono: GraduationCap, items: PANEL_ALUMNO },
};

/**
 * Roles cuyo menú ofrece la ruta. El router lo usa como guardia.
 */
export function rolesConAcceso(ruta: string): RoleCode[] {
  if (ruta === "/app/notificaciones") return ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];
  if (ruta === "/app/alumnos") return ["PROPIETARIA", "PROFESORA"];
  return (Object.keys(MENU_POR_ROL) as RoleCode[]).filter(
    (rol) => MENU_POR_ROL[rol].some((item) => ofreceLaRuta(item, ruta)) || GRUPO_DEL_ROL[rol].to === ruta,
  );
}

/**
 * Retorna los ítems de navegación según el rol activo de la persona.
 * Con el switch de roles, la persona con múltiples roles alterna directamente
 * entre las vistas de Propietaria y Profesora.
 */
export function itemsDelMenu(roles: readonly RoleCode[], rolActivo?: RoleCode): ItemMenu[] {
  if (rolActivo && roles.includes(rolActivo) && MENU_POR_ROL[rolActivo]) {
    return MENU_POR_ROL[rolActivo];
  }
  const principal = rolPrincipal((rol) => roles.includes(rol));
  if (!principal) return [];
  return MENU_POR_ROL[principal];
}
