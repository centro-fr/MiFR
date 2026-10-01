import {
  Banknote,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  Tag,
  Users,
} from "lucide-react";

export interface ItemMenu {
  etiqueta: string;
  icono: typeof LayoutDashboard;
  to?: string;
  activo?: boolean;
}

export const ITEMS_PROPIETARIA: ItemMenu[] = [
  { etiqueta: "Dashboard General", icono: LayoutDashboard, to: "/app/dashboard" },
  { etiqueta: "Alumnos", icono: Users },
  { etiqueta: "Actividades y Horarios", icono: CalendarDays },
  { etiqueta: "Planes y Precios", icono: Tag },
  { etiqueta: "Pagos y Cuotas", icono: Banknote },
  { etiqueta: "Asistencia Global", icono: ClipboardCheck },
  { etiqueta: "Configuración", icono: Settings, to: "/app/seguridad/permisos" },
];
