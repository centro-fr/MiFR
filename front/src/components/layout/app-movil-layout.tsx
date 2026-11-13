import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { CampanaNotificaciones } from "@/features/notificaciones/components/campana-notificaciones";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoFr } from "@/components/marca/logo-fr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { homePathForRoles } from "@/types/auth";
import { EnAppMovilContext, ordenEnLaBarra } from "./en-app-movil";
import type { ItemConEstado } from "./use-owner-navigation";
import { usePanelActivo } from "./use-panel-activo";
import { panelExclusivoDeLaRuta, type Panel } from "./owner-navigation";

// Shell de la app en el celular para la profesora y el alumno: barra superior oscura con el título de
// la pantalla y barra de navegación inferior. En desktop esos roles usan el sidebar de OwnerLayout.

interface Props {
  children: ReactNode;
  items: ItemConEstado[];
  titulo: string;
  /** Pantalla de detalle (asistencia, ficha): la flecha de volver reemplaza al logo. */
  volverA?: string;
  /** Al medio de la barra superior: el selector de menor del tutor. */
  centro?: ReactNode;
}

function iniciales(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toLocaleUpperCase("es");
}

function SelectorRolMovil() {
  const { roles } = usePermissions();
  const { panelActivo, elegirPanel } = usePanelActivo();
  const navigate = useNavigate();

  const tieneLosDos = roles.includes("PROPIETARIA") && roles.includes("PROFESORA");
  if (!tieneLosDos) return null;

  const cambiarRol = (nuevoPanel: Panel) => {
    elegirPanel(nuevoPanel);
    const panelDeLaRuta = panelExclusivoDeLaRuta(window.location.pathname);
    if (panelDeLaRuta && panelDeLaRuta !== nuevoPanel) {
      navigate(homePathForRoles([nuevoPanel]));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Cambiar vista de rol"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/20 bg-white/5"
        >
          <span>{panelActivo === "PROPIETARIA" ? "Propietaria" : "Profesora"}</span>
          <ChevronDown className="size-3.5 text-slate-300" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36 rounded-xl p-1 bg-slate-900 border-slate-800 text-white shadow-xl">
        <DropdownMenuItem
          onClick={() => cambiarRol("PROPIETARIA")}
          className={cn(
            "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 hover:text-white",
            panelActivo === "PROPIETARIA" && "bg-primary/20 text-white font-bold",
          )}
        >
          Propietaria
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => cambiarRol("PROFESORA")}
          className={cn(
            "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 hover:text-white",
            panelActivo === "PROFESORA" && "bg-primary/20 text-white font-bold",
          )}
        >
          Profesora
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BarraSuperior({ titulo, volverA, centro }: Pick<Props, "titulo" | "volverA" | "centro">) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar pr-2 pl-3 text-sidebar-foreground">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {volverA ? (
          <Link
            to={volverA}
            aria-label="Volver"
            className="-ml-2 flex size-11 items-center justify-center rounded-lg text-slate-300 hover:text-white"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
        ) : (
          <LogoFr className="size-7" />
        )}
        <span className="truncate text-base font-bold">{titulo}</span>
        <SelectorRolMovil />
      </div>
      {centro}
      <div className="flex flex-1 items-center justify-end gap-0.5">
        <CampanaNotificaciones sobreFondoOscuro />
        <ThemeToggle
          compacto
          className="text-slate-300 hover:bg-white/10 hover:text-white"
        />
        <Link
          to="/app/perfil"
          aria-label="Mi cuenta"
          className="flex size-11 items-center justify-center rounded-lg"
        >
          <span className="flex size-7.5 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-primary-dark">
            {user ? iniciales(user.nombre, user.apellido) : ""}
          </span>
        </Link>
      </div>
    </header>
  );
}

function ItemDeLaBarra({ item }: { item: ItemConEstado }) {
  const Icono = item.icono;
  const actual = item.esActivo ? "page" : undefined;
  if (item.destacado) {
    return (
      <Link
        to={item.to ?? "/app"}
        aria-current={actual}
        className={cn(
          "flex flex-col items-center gap-1 text-xs",
          item.esActivo ? "font-bold text-primary-dark dark:text-pink-300" : "font-semibold text-muted-foreground",
        )}
      >
        <span className="-mt-6 flex size-14 items-center justify-center rounded-full border-4 border-card bg-primary text-white shadow-md">
          <Icono aria-hidden="true" className="size-6" />
        </span>
        {item.etiqueta}
      </Link>
    );
  }
  return (
    <Link
      to={item.to ?? "/app"}
      aria-current={actual}
      className={cn(
        "flex h-13 flex-col items-center justify-end gap-1 text-xs",
        // La sección activa se marca solo con el color y el peso, sin fondo.
        item.esActivo ? "font-bold text-primary-dark dark:text-pink-300" : "font-semibold text-muted-foreground",
      )}
    >
      <span className="flex h-7 items-center justify-center">
        <Icono aria-hidden="true" className="size-5" strokeWidth={item.esActivo ? 2.4 : 2} />
      </span>
      {item.etiqueta}
    </Link>
  );
}

function BarraInferior({ items }: { items: ItemConEstado[] }) {
  const ordenados = ordenEnLaBarra(items);
  return (
    <nav
      aria-label="Menú principal"
      style={{ gridTemplateColumns: `repeat(${ordenados.length}, minmax(0, 1fr))` }}
      className="fixed inset-x-0 bottom-0 z-30 grid items-end border-t border-border bg-card px-1 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {ordenados.map((item) => (
        <ItemDeLaBarra key={item.to ?? item.etiqueta} item={item} />
      ))}
    </nav>
  );
}

export function AppMovilLayout({ children, items, titulo, volverA, centro }: Props) {
  return (
    <EnAppMovilContext.Provider value>
      <div className="flex min-h-dvh flex-col bg-bg-light text-foreground dark:bg-canvas">
        <BarraSuperior titulo={titulo} volverA={volverA} centro={centro} />
        <main className="flex w-full min-w-0 flex-1 flex-col gap-4 px-4 pt-5 pb-28">{children}</main>
        <BarraInferior items={items} />
      </div>
    </EnAppMovilContext.Provider>
  );
}
