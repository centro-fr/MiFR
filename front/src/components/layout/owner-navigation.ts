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
  // Glosario: nunca "pago" en la UI. Cobro = efectivo de profesora, transferencia = aviso del alumno.
  { etiqueta: "Transferencias y Cobros", icono: Banknote },
  { etiqueta: "Asistencia Global", icono: ClipboardCheck },
  { etiqueta: "Honorarios Docentes", icono: Receipt },
  { etiqueta: "Notificaciones", icono: Bell },
  { etiqueta: "Reportes", icono: BarChart3 },
  { etiqueta: "Configuración", icono: Settings, to: "/app/seguridad/permisos" },
];
