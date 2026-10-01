import { Link, useLocation } from "react-router-dom";
import {
  Banknote,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/utils/cn";
export { OwnerLayout } from "./owner-layout";
export { ITEMS_PROPIETARIA } from "./owner-navigation";

interface ItemMenu {
  etiqueta: string;
  icono: typeof LayoutDashboard;
  to?: string;
  activo?: boolean;
}

// Menú de propietaria (diseño original). Los ítems sin ruta corresponden a
// pantallas aún no implementadas y se muestran deshabilitados.
const ITEMS: ItemMenu[] = [
  { etiqueta: "Dashboard General", icono: LayoutDashboard, to: "/app/dashboard" },
  { etiqueta: "Alumnos", icono: Users },
  { etiqueta: "Actividades y Horarios", icono: CalendarDays },
  { etiqueta: "Planes y Precios", icono: Tag },
  { etiqueta: "Pagos y Cuotas", icono: Banknote },
  { etiqueta: "Asistencia Global", icono: ClipboardCheck },
  { etiqueta: "Configuración", icono: Settings, to: "/app/seguridad/permisos", activo: true },
];

export function OwnerSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-dark to-primary text-base font-extrabold tracking-wider text-white shadow-md"
        >
          FR
        </span>
        <div>
          <p className="text-base font-extrabold leading-tight tracking-tight text-slate-900">MiFR</p>
          <p className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-dark">
            Propietaria
          </p>
        </div>
      </div>

      <nav aria-label="Administración" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {ITEMS.map(({ etiqueta, icono: Icono, to, activo }) => {
          const esActivo = activo ?? (to !== undefined && location.pathname === to);
          const clases = cn(
            "flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
            esActivo ? "bg-primary/10 text-primary-dark" : "text-slate-600 hover:bg-slate-100",
          );
          const contenido = (
            <>
              <Icono aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="flex-1">{etiqueta}</span>
              {esActivo && <span aria-hidden="true" className="h-5 w-1 rounded-full bg-primary" />}
            </>
          );
          return to ? (
            <Link key={etiqueta} to={to} aria-current={esActivo ? "page" : undefined} className={clases}>
              {contenido}
            </Link>
          ) : (
            <span key={etiqueta} title="Pantalla pendiente" className={cn(clases, "cursor-default opacity-70")}>
              {contenido}
            </span>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        {user && (
          <p className="truncate px-1 text-xs font-medium text-slate-500">
            {user.nombre} {user.apellido}
          </p>
        )}
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-1 flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <LogOut aria-hidden="true" className="h-5 w-5 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
