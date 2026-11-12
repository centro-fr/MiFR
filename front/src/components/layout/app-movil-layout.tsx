import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CampanaNotificaciones } from "@/features/notificaciones/components/campana-notificaciones";
import { LogoFr } from "@/components/marca/logo-fr";
import { cn } from "@/utils/cn";
import { EnAppMovilContext, ordenEnLaBarra } from "./en-app-movil";
import type { ItemConEstado } from "./use-owner-navigation";

// Shell de la app en el celular para la profesora y el alumno: barra superior oscura con el título de
// la pantalla y barra de navegación inferior. En desktop esos roles usan el sidebar de OwnerLayout.

interface Props {
  children: ReactNode;
  items: ItemConEstado[];
  titulo: string;
  /** Pantalla de detalle (asistencia, ficha): la flecha de volver reemplaza al logo. */
  volverA?: string;
}

function iniciales(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toLocaleUpperCase("es");
}

function BarraSuperior({ titulo, volverA }: Pick<Props, "titulo" | "volverA">) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 bg-dark pr-2 pl-3 text-white">
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
      <div className="ml-auto flex items-center gap-0.5">
        <CampanaNotificaciones sobreFondoOscuro />
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
        item.esActivo ? "font-bold text-primary-dark dark:text-pink-300" : "font-semibold text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full",
          item.esActivo && "bg-primary/12",
        )}
      >
        <Icono aria-hidden="true" className="size-5" />
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

export function AppMovilLayout({ children, items, titulo, volverA }: Props) {
  return (
    <EnAppMovilContext.Provider value>
      <div className="flex min-h-dvh flex-col bg-bg-light text-foreground dark:bg-canvas">
        <BarraSuperior titulo={titulo} volverA={volverA} />
        <main className="flex w-full min-w-0 flex-1 flex-col gap-4 px-4 pt-5 pb-28">{children}</main>
        <BarraInferior items={items} />
      </div>
    </EnAppMovilContext.Provider>
  );
}
