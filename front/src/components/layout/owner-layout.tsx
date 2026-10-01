import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/utils/cn";
import { ITEMS_PROPIETARIA } from "./owner-navigation";

interface OwnerLayoutProps {
  children: ReactNode;
}

export function OwnerLayout({ children }: OwnerLayoutProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Manejo de tecla Escape y bloqueo de scroll al abrir el menú en mobile
  useEffect(() => {
    if (!menuAbierto) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuAbierto(false);
      }
    }

    const scrollAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = scrollAnterior;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuAbierto]);

  function renderNavItems(onItemClick?: () => void) {
    return ITEMS_PROPIETARIA.map(({ etiqueta, icono: Icono, to, activo }) => {
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
        <Link
          key={etiqueta}
          to={to}
          onClick={onItemClick}
          aria-current={esActivo ? "page" : undefined}
          className={clases}
        >
          {contenido}
        </Link>
      ) : (
        <span
          key={etiqueta}
          title="Próximamente"
          className={cn(clases, "cursor-default opacity-70")}
        >
          {contenido}
        </span>
      );
    });
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#F8FAFC] text-slate-900 lg:flex-row">
      {/* ================= HEADER MOBILE ================= */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú de navegación"
            aria-expanded={menuAbierto}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-dark to-primary text-xs font-black tracking-wider text-white shadow-sm"
            >
              FR
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-slate-900">MiFR Centro</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                PROPIETARIA
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ================= DRAWER MOBILE (OVERLAY + SHEET) ================= */}
      {menuAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-50 lg:hidden"
        >
          {/* Backdrop con desenfoque suave */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuAbierto(false)}
            aria-hidden="true"
          />

          {/* Drawer contenedor deslizable */}
          <div className="fixed inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Header del drawer */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-dark to-primary text-xs font-black tracking-wider text-white shadow-sm"
                >
                  FR
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-extrabold text-slate-900">MiFR Centro</p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                    PROPIETARIA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista de navegación */}
            <nav
              aria-label="Navegación móvil"
              className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
            >
              {renderNavItems(() => setMenuAbierto(false))}
            </nav>

            {/* Footer con usuario y cerrar sesión */}
            <div className="border-t border-slate-100 p-4">
              {user && (
                <p className="truncate px-1 text-xs font-medium text-slate-500">
                  {user.nombre} {user.apellido}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  void logout();
                }}
                className="mt-1 flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                <LogOut aria-hidden="true" className="h-5 w-5 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SIDEBAR DESKTOP ================= */}
      <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-dark to-primary text-base font-extrabold tracking-wider text-white shadow-md"
          >
            FR
          </span>
          <div>
            <p className="text-base font-extrabold leading-tight tracking-tight text-slate-900">
              MiFR Centro
            </p>
            <p className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-dark">
              Propietaria
            </p>
          </div>
        </div>

        <nav aria-label="Administración" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {renderNavItems()}
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

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <main className="flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
