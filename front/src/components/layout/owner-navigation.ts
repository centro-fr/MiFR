import {
  Banknote,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Receipt,
  Settings,
  Tag,
  Users,
} from "lucide-react";

export interface SubItemMenu {
  etiqueta: string;
  to: string;
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
  { etiqueta: "Alumnos", icono: Users, to: "/app/alumnos" },
  {
    etiqueta: "Actividades y Horarios",
    icono: CalendarDays,
    hijos: [
      // US-03: disciplinas y cupos.
      { etiqueta: "Actividades", to: "/app/actividades" },
      // US-04: cronograma semanal con profesoras asignadas.
      { etiqueta: "Horarios", to: "/app/horarios" },
    ],
  },
  { etiqueta: "Planes y Precios", icono: Tag, to: "/app/planes" },
  // Glosario: nunca "pago" en la UI. Cobro = efectivo de profesora, transferencia = aviso del alumno.
  { etiqueta: "Cobros y Cuotas", icono: Banknote, to: "/app/pagos" },
  { etiqueta: "Asistencia", icono: ClipboardCheck, to: "/app/asistencia" },
  { etiqueta: "Honorarios", icono: Receipt, to: "/app/honorarios" },
  { etiqueta: "Notificaciones", icono: Bell, to: "/app/notificaciones" },
  { etiqueta: "Reportes", icono: BarChart3, to: "/app/reportes" },
  { etiqueta: "Configuración", icono: Settings, to: "/app/seguridad/permisos" },
];
