import {
  ArrowLeftRight,
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
  List,
  Presentation,
  Receipt,
  Settings,
  Tag,
  TrendingUp,
  Trophy,
  UserCheck,
  UserRound,
  Users,
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
  /**
   * También queda marcada en las subrutas de esta ruta que no tienen opción propia: la ficha
   * /app/alumnos/12 se abre desde el listado, así que marca "Listado".
   */
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
  /** Si tiene hijos, el ítem es un grupo desplegable. */
  hijos?: SubItemMenu[];
}

const SUBRUTAS_DE_ALUMNOS = "/app/alumnos";

// MENUS.md: secciones por tema, para que lo relacionado quede junto.
const SECCION_CONTROL_ALUMNOS = "Control Alumnos";
const SECCION_CLASES = "Gestión";
const SECCION_ADMINISTRACION = "Administración";

export const ITEMS_PROPIETARIA: ItemMenu[] = [
  { etiqueta: "Dashboard", icono: LayoutDashboard, to: "/app/dashboard" },
  // MENUS.md: Alumnos agrupa listado, ficha, pre-inscripciones y bajas. La ficha y la baja (US-08)
  // se abren desde el listado (US-10): /app/alumnos/:id.
  {
    etiqueta: "Alumnos",
    icono: Users,
    seccion: SECCION_CONTROL_ALUMNOS,
    to: "/app/alumnos",
    descripcion: "Listado, fichas y pre-inscripciones de los alumnos del centro.",
    hijos: [
      {
        etiqueta: "Listado",
        to: "/app/alumnos/listado",
        icono: List,
        descripcion: "Buscar alumnos, ver su ficha y su estado de cuota.",
        subrutasDe: SUBRUTAS_DE_ALUMNOS,
      },
      // US-07: pre-inscripciones que esperan su primer cobro o transferencia.
      {
        etiqueta: "Pendientes de alta",
        to: "/app/alumnos/pendientes",
        contador: "PENDIENTES_DE_ALTA",
        icono: UserCheck,
        descripcion: "Confirmar el alta de quienes abonan su primera cuota.",
      },
    ],
  },
  // US-20 a US-22: asistencia de los alumnos a las clases.
  { etiqueta: "Asistencia", icono: ClipboardCheck, seccion: SECCION_CONTROL_ALUMNOS, to: "/app/asistencia" },
  // Glosario: nunca "pago" en la UI. Cobro = efectivo de profesora, transferencia = aviso del alumno.
  // MENUS.md: agrupa US-15 a US-19; por ahora solo está la revisión de transferencias.
  {
    etiqueta: "Cobros y Cuotas",
    icono: Banknote,
    seccion: SECCION_CONTROL_ALUMNOS,
    to: "/app/pagos",
    descripcion: "Transferencias, cobros en efectivo y cuotas de los alumnos.",
    hijos: [
      {
        etiqueta: "Estado de cuotas",
        to: "/app/pagos/cuotas",
        icono: Banknote,
        descripcion: "Supervisar vencimientos de cuotas y registrar cobros en efectivo.",
      },
      // US-17: transferencias informadas por los alumnos que esperan verificación.
      {
        etiqueta: "Transferencias pendientes",
        to: "/app/pagos/transferencias",
        contador: "TRANSFERENCIAS_PENDIENTES",
        icono: ArrowLeftRight,
        descripcion: "Verificar en el extracto y aprobar o rechazar las transferencias informadas.",
      },
    ],
  },
  // US-03: disciplinas y cupos.
  { etiqueta: "Actividades", icono: Dumbbell, seccion: SECCION_CLASES, to: "/app/actividades" },
  // US-04: cronograma semanal con profesoras asignadas.
  { etiqueta: "Horarios", icono: CalendarDays, seccion: SECCION_CLASES, to: "/app/horarios" },
  { etiqueta: "Planes y Precios", icono: Tag, seccion: SECCION_CLASES, to: "/app/planes" },
  // US-23 y US-24: lo que se les paga a las profesoras.
  { etiqueta: "Honorarios", icono: Receipt, seccion: SECCION_ADMINISTRACION, to: "/app/honorarios" },
  { etiqueta: "Reportes", icono: BarChart3, seccion: SECCION_ADMINISTRACION, to: "/app/reportes" },
  { etiqueta: "Notificaciones", icono: Bell, seccion: SECCION_ADMINISTRACION, to: "/app/notificaciones" },
  { etiqueta: "Configuración", icono: Settings, seccion: SECCION_ADMINISTRACION, to: "/app/seguridad/permisos" },
];

const PERFIL: ItemMenu = { etiqueta: "Perfil", icono: UserRound, to: "/app/perfil" };

// Las clases son lo propio de la profesora: si además es propietaria, es lo único que suma a su
// menú, porque alumnos y cobros ya los gestiona desde el suyo.
const CLASES_PROFESORA: ItemMenu[] = [
  // US-20: clases del día.
  { etiqueta: "Hoy", icono: CalendarClock, to: "/app/hoy", descripcion: "Las clases del día y la toma de asistencia." },
  { etiqueta: "Mis clases", icono: BookOpen, to: "/app/mis-clases", descripcion: "El historial de tus clases y sus asistencias." },
];

// MENUS.md: la profesora no ve honorarios, reportes ni la configuración de planes o actividades.
export const ITEMS_PROFESORA: ItemMenu[] = [
  ...CLASES_PROFESORA,
  // US-05, US-06, US-09 y US-10: listado, pre-inscripción y ficha. "Pendientes de alta" (US-07) es de la propietaria.
  // Sin grupo: va directo al listado, y la ficha (/app/alumnos/:id) la mantiene marcada.
  { etiqueta: "Alumnos", icono: Users, to: "/app/alumnos/listado", subrutasDe: SUBRUTAS_DE_ALUMNOS },
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

// De mayor a menor alcance: el primero que tenga la sesión define el menú principal.
const ROLES_POR_ALCANCE: RoleCode[] = ["PROPIETARIA", "PROFESORA", "ALUMNO", "TUTOR"];

// Lo que suma un rol cuando no es el principal: solo lo propio de ese rol, sin repetir lo que ya
// tiene el menú principal. Perfil queda afuera porque es de la persona, no de un rol.
const GRUPO_DEL_ROL: Record<RoleCode, Pick<ItemMenu, "etiqueta" | "icono" | "to" | "descripcion"> & { items: ItemMenu[] }> = {
  PROPIETARIA: { etiqueta: "Propietaria", icono: LayoutDashboard, items: ITEMS_PROPIETARIA },
  PROFESORA: {
    etiqueta: "Profesora",
    icono: Presentation,
    to: "/app/profesora",
    descripcion: "Tus clases como profesora: las de hoy y su historial.",
    items: CLASES_PROFESORA,
  },
  ALUMNO: { etiqueta: "Alumno", icono: GraduationCap, items: PANEL_ALUMNO },
  TUTOR: { etiqueta: "Tutor", icono: GraduationCap, items: PANEL_ALUMNO },
};

const SECCION_OTROS_ROLES = "Otros roles";

// Las pantallas propias de un rol plegadas en un solo grupo desplegable, como sub-opciones.
function grupoDelRol(rol: RoleCode): ItemMenu {
  const { items, ...grupo } = GRUPO_DEL_ROL[rol];
  const hijos = items.flatMap(
    (item): SubItemMenu[] =>
      item.hijos ?? (item.to ? [{ etiqueta: item.etiqueta, to: item.to, icono: item.icono, descripcion: item.descripcion }] : []),
  );
  // Con su propio título al final: así se ve que no es parte del menú del rol principal.
  return { ...grupo, seccion: SECCION_OTROS_ROLES, hijos };
}

/**
 * Roles cuyo menú ofrece la ruta, incluida la pantalla del grupo que suma un rol extra. El router lo
 * usa como guardia: lo que no está en el menú de un rol tampoco se abre escribiendo la URL, y menú
 * y rutas no pueden desalinearse.
 */
export function rolesConAcceso(ruta: string): RoleCode[] {
  return (Object.keys(MENU_POR_ROL) as RoleCode[]).filter(
    (rol) => MENU_POR_ROL[rol].some((item) => ofreceLaRuta(item, ruta)) || GRUPO_DEL_ROL[rol].to === ruta,
  );
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
