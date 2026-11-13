import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Dumbbell,
  Gift,
  GraduationCap,
  House,
  LayoutDashboard,
  Presentation,
  Receipt,
  Tag,
  Tags,
  Trophy,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { RoleCode } from "@/types/auth";

/** Contadores que puede mostrar una sub-opción; el número lo resuelve el layout. */
export type ContadorMenu = "POR_VERIFICAR";

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
  /** En la barra inferior del celular va al centro y resaltado (el Inicio del alumno). */
  destacado?: boolean;
}

const SUBRUTAS_DE_ALUMNOS = "/app/alumnos";

// Secciones de la navegación según diseño (ALUMNOS, COBROS, PAGOS, REPORTES, CENTRO)
const SECCION_ALUMNOS = "Alumnos";
const SECCION_COBROS = "Cobros";
const SECCION_PAGOS = "Pagos";
const SECCION_REPORTES = "Reportes";
const SECCION_CENTRO = "Centro";

export const ITEMS_PROPIETARIA: ItemMenu[] = [
  { etiqueta: "Inicio", icono: House, to: "/app/dashboard" },
  {
    etiqueta: "Listado",
    icono: Users,
    seccion: SECCION_ALUMNOS,
    to: "/app/alumnos/listado",
    descripcion: "Buscar alumnos, ver su ficha y su estado de cuota.",
    subrutasDe: SUBRUTAS_DE_ALUMNOS,
  },
  {
    etiqueta: "Por verificar",
    icono: ArrowLeftRight,
    seccion: SECCION_COBROS,
    to: "/app/por-verificar",
    contador: "POR_VERIFICAR",
    descripcion: "Transferencias informadas y altas nuevas que esperan su pago.",
  },
  {
    etiqueta: "Efectivo a rendir",
    icono: Banknote,
    seccion: SECCION_COBROS,
    to: "/app/cobros/efectivo",
    descripcion: "Efectivo cobrado por las profesoras pendiente de rendición.",
  },
  {
    etiqueta: "Historial",
    icono: Receipt,
    seccion: SECCION_COBROS,
    to: "/app/cobros/listado",
    subrutasDe: "/app/cobros",
    descripcion: "Historial de cobros confirmados y descarga de comprobantes.",
  },
  {
    etiqueta: "Honorarios",
    icono: Wallet,
    seccion: SECCION_PAGOS,
    to: "/app/honorarios",
    descripcion: "Revisa el cálculo del pago mensual para cada profesor/a.",
  },
  { etiqueta: "Inscripciones", icono: BarChart3, seccion: SECCION_REPORTES, to: "/app/reportes/inscripciones", subrutasDe: "/app/reportes" },
  { etiqueta: "Planes más elegidos", icono: Tags, seccion: SECCION_REPORTES, to: "/app/reportes/planes" },
  { etiqueta: "Ocupación", icono: CalendarClock, seccion: SECCION_REPORTES, to: "/app/reportes/ocupacion" },
  { etiqueta: "Ranking", icono: Trophy, seccion: SECCION_REPORTES, to: "/app/reportes/ranking" },
  { etiqueta: "Actividades", icono: Dumbbell, seccion: SECCION_CENTRO, to: "/app/actividades" },
  { etiqueta: "Profesores", icono: GraduationCap, seccion: SECCION_CENTRO, to: "/app/profesoras", subrutasDe: "/app/profesoras", descripcion: "Plantel de profesores, especialidades y staff." },
  { etiqueta: "Horarios", icono: CalendarDays, seccion: SECCION_CENTRO, to: "/app/horarios" },
  { etiqueta: "Planes", icono: Tag, seccion: SECCION_CENTRO, to: "/app/planes" },
  { etiqueta: "Promociones", icono: Gift, seccion: SECCION_CENTRO, to: "/app/planes/promociones" },
];

const PERFIL: ItemMenu = { etiqueta: "Perfil", icono: UserRound, to: "/app/perfil" };

// Inicio de la profesora: sus clases y las cuotas de sus alumnos que vencen hoy. En la barra inferior del
// celular va al medio, como el del alumno.
const CLASES_PROFESORA: ItemMenu[] = [
  {
    etiqueta: "Inicio",
    icono: House,
    to: "/app/inicio",
    destacado: true,
    descripcion: "Tus clases de hoy y las cuotas de tus alumnos que vencen hoy.",
  },
  {
    etiqueta: "Mis clases",
    icono: CalendarCheck,
    to: "/app/hoy",
    descripcion: "Tu semana de clases y la toma de asistencia.",
  },
];

export const ITEMS_PROFESORA: ItemMenu[] = [
  ...CLASES_PROFESORA,
  { etiqueta: "Alumnos", icono: Users, to: "/app/alumnos/listado", subrutasDe: SUBRUTAS_DE_ALUMNOS },
  { etiqueta: "Ranking", icono: Trophy, to: "/app/ranking" },
  PERFIL,
];

const PANEL_ALUMNO: ItemMenu[] = [
  { etiqueta: "Inicio", icono: House, to: "/app/inicio", destacado: true },
  { etiqueta: "Clases", icono: CalendarDays, to: "/app/clases" },
  { etiqueta: "Rutina", icono: Dumbbell, to: "/app/rutina" },
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
  if (ruta.startsWith("/app/cobros/")) return "PROPIETARIA";
  const paneles = PANELES.filter((panel) => MENU_POR_ROL[panel].some((item) => ofreceLaPantalla(item, ruta)));
  return paneles.length === 1 ? paneles[0] : null;
}

const GRUPO_DEL_ROL: Record<RoleCode, Pick<ItemMenu, "etiqueta" | "icono" | "to" | "descripcion"> & { items: ItemMenu[] }> = {
  PROPIETARIA: { etiqueta: "Propietaria", icono: LayoutDashboard, items: ITEMS_PROPIETARIA },
  PROFESORA: {
    etiqueta: "Profesor/a",
    icono: Presentation,
    to: "/app/profesora",
    descripcion: "Tus clases como profesor/a y la toma de asistencia.",
    items: CLASES_PROFESORA,
  },
  ALUMNO: { etiqueta: "Alumno", icono: GraduationCap, items: PANEL_ALUMNO },
  TUTOR: { etiqueta: "Tutor", icono: GraduationCap, items: PANEL_ALUMNO },
};

/**
 * Roles cuyo menú ofrece la ruta. El router lo usa como guardia.
 */
export function rolesConAcceso(ruta: string): RoleCode[] {
  if (ruta === "/app/alumnos") return ["PROPIETARIA", "PROFESORA"];
  if (ruta === "/app/cobros") return ["PROPIETARIA", "PROFESORA"];
  if (ruta === "/app/pagos") return ["PROPIETARIA"];
  if (ruta === "/app/ausentes") return ["PROPIETARIA"];
  if (ruta === "/app/reportes") return ["PROPIETARIA"];
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
