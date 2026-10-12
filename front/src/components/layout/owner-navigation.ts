import {
  Banknote,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Dumbbell,
  LayoutDashboard,
  Receipt,
  Settings,
  Tag,
  Users,
} from "lucide-react";

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
