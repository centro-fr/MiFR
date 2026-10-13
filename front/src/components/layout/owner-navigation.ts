import {
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  GraduationCap,
  House,
  LayoutDashboard,
  Presentation,
  Receipt,
  Settings,
  Tag,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import type { RoleCode } from "@/types/auth";

/** Contadores que puede mostrar una sub-opción; el número lo resuelve el layout. */
export type ContadorMenu = "PENDIENTES_DE_ALTA";

export interface SubItemMenu {
  etiqueta: string;
  to: string;
  contador?: ContadorMenu;
}

export interface ItemMenu {
  etiqueta: string;
  icono: typeof LayoutDashboard;
  to?: string;
  activo?: boolean;
  /** Si tiene hijos, el ítem es un grupo desplegable (sin ruta propia). */
  hijos?: SubItemMenu[];
}

export const ITEMS_PROPIETARIA: ItemMenu[] = [
  { etiqueta: "Dashboard", icono: LayoutDashboard, to: "/app/dashboard" },
  // MENUS.md: Alumnos agrupa listado, ficha, pre-inscripciones y bajas. La ficha y la baja (US-08)
  // se abren desde el listado (US-10): /app/alumnos/baja/:idAlumno.
  {
    etiqueta: "Alumnos",
    icono: Users,
    hijos: [
      { etiqueta: "Listado", to: "/app/alumnos" },
      // US-07: pre-inscripciones que esperan su primer cobro o transferencia.
      { etiqueta: "Pendientes de alta", to: "/app/alumnos/pendientes", contador: "PENDIENTES_DE_ALTA" },
    ],
  },
  // US-03: disciplinas y cupos.
  { etiqueta: "Actividades", icono: Dumbbell, to: "/app/actividades" },
  // US-04: cronograma semanal con profesoras asignadas.
  { etiqueta: "Horarios", icono: CalendarDays, to: "/app/horarios" },
  { etiqueta: "Planes y Precios", icono: Tag, to: "/app/planes" },
  // Glosario: nunca "pago" en la UI. Cobro = efectivo de profesora, transferencia = aviso del alumno.
  { etiqueta: "Cobros y Cuotas", icono: Banknote, to: "/app/pagos" },
  { etiqueta: "Asistencia", icono: ClipboardCheck, to: "/app/asistencia" },
  { etiqueta: "Honorarios", icono: Receipt, to: "/app/honorarios" },
  { etiqueta: "Notificaciones", icono: Bell, to: "/app/notificaciones" },
  { etiqueta: "Reportes", icono: BarChart3, to: "/app/reportes" },
  { etiqueta: "Configuración", icono: Settings, to: "/app/seguridad/permisos" },
];

const PERFIL: ItemMenu = { etiqueta: "Perfil", icono: UserRound, to: "/app/perfil" };

// Las clases son lo propio de la profesora: si además es propietaria, es lo único que suma a su
// menú, porque alumnos y cobros ya los gestiona desde el suyo.
const CLASES_PROFESORA: ItemMenu[] = [
  // US-20: clases del día.
  { etiqueta: "Hoy", icono: CalendarClock, to: "/app/hoy" },
  { etiqueta: "Mis clases", icono: BookOpen, to: "/app/mis-clases" },
];

// MENUS.md: la profesora no ve honorarios, reportes ni la configuración de planes o actividades.
export const ITEMS_PROFESORA: ItemMenu[] = [
  ...CLASES_PROFESORA,
  // US-05, US-06, US-09 y US-10: listado, pre-inscripción y ficha. "Pendientes de alta" (US-07) es de la propietaria.
  { etiqueta: "Alumnos", icono: Users, to: "/app/alumnos" },
  // US-15: cobro en efectivo.
  { etiqueta: "Cobros", icono: Banknote, to: "/app/cobros" },
  PERFIL,
];

const PANEL_ALUMNO: ItemMenu[] = [
  { etiqueta: "Inicio", icono: House, to: "/app/inicio" },
  { etiqueta: "Mi plan", icono: CreditCard, to: "/app/mi-plan" },
  { etiqueta: "Progreso", icono: TrendingUp, to: "/app/progreso" },
  { etiqueta: "Comunidad", icono: Trophy, to: "/app/comunidad" },
];

// El tutor ve lo mismo que el alumno: consulta el plan y el progreso del menor a su cargo.
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

/**
 * Roles cuyo menú ofrece la ruta. El router lo usa como guardia: lo que no está en el menú de un
 * rol tampoco se abre escribiendo la URL, y menú y rutas no pueden desalinearse.
 */
export function rolesConAcceso(ruta: string): RoleCode[] {
  return (Object.keys(MENU_POR_ROL) as RoleCode[]).filter((rol) => MENU_POR_ROL[rol].some((item) => ofreceLaRuta(item, ruta)));
}

// De mayor a menor alcance: el primero que tenga la sesión define el menú principal.
const ROLES_POR_ALCANCE: RoleCode[] = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];

// Lo que suma un rol cuando no es el principal: solo lo propio de ese rol, sin repetir lo que ya
// tiene el menú principal. Perfil queda afuera porque es de la persona, no de un rol.
const GRUPO_DEL_ROL: Record<RoleCode, Pick<ItemMenu, "etiqueta" | "icono"> & { items: ItemMenu[] }> = {
  PROPIETARIA: { etiqueta: "Propietaria", icono: LayoutDashboard, items: ITEMS_PROPIETARIA },
  PROFESORA: { etiqueta: "Profesora", icono: Presentation, items: CLASES_PROFESORA },
  ALUMNO: { etiqueta: "Alumno", icono: GraduationCap, items: PANEL_ALUMNO },
  TUTOR: { etiqueta: "Tutor", icono: GraduationCap, items: PANEL_ALUMNO },
};

// Las pantallas propias de un rol plegadas en un solo grupo desplegable, como sub-opciones.
function grupoDelRol(rol: RoleCode): ItemMenu {
  const { items, ...grupo } = GRUPO_DEL_ROL[rol];
  const hijos = items.flatMap((item) => item.hijos ?? (item.to ? [{ etiqueta: item.etiqueta, to: item.to }] : []));
  return { ...grupo, hijos };
}

/**
 * Con más de un rol, el menú del rol de más alcance va completo y cada rol extra se suma como un
 * grupo con su nombre: la propietaria que dicta clases ve "Profesora" con Hoy y Mis clases.
 * Así se ve de qué rol sale cada pantalla y el menú principal no crece de a varios ítems.
 */
export function itemsDelMenu(roles: readonly RoleCode[]): ItemMenu[] {
  const [principal, ...extras] = ROLES_POR_ALCANCE.filter((rol) => roles.includes(rol));
  if (!principal) return [];
  // Alumno y tutor comparten menú: el mismo grupo no se repite.
  const menusIncluidos = new Set([MENU_POR_ROL[principal]]);
  const grupos: ItemMenu[] = [];
  for (const rol of extras) {
    if (menusIncluidos.has(MENU_POR_ROL[rol])) continue;
    menusIncluidos.add(MENU_POR_ROL[rol]);
    grupos.push(grupoDelRol(rol));
  }
  return [...MENU_POR_ROL[principal], ...grupos];
}
