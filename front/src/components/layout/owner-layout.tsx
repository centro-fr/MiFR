import { useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/utils/cn";
import { ITEMS_PROPIETARIA } from "./owner-navigation";

interface OwnerLayoutProps {
  children: ReactNode;
}

export function OwnerLayout({ children }: OwnerLayoutProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
  const abrirMenu = useCallback(() => setMenuAbierto(true), []);
  const handleLogout = useCallback(() => {
    setMenuAbierto(false);
    void logout();
  }, [logout]);

  // Drawer mobile como diálogo accesible: Escape, trampa de foco,
  // foco inicial, bloqueo de scroll y retorno de foco al cerrar.
  const drawerRef = useRef<HTMLElement>(null);
  useDialogA11y({ active: menuAbierto, onClose: cerrarMenu, dialogRef: drawerRef });

  const navItems = useMemo(
    () =>
      ITEMS_PROPIETARIA.map(({ etiqueta, to, activo }) => {
        const esActivo = activo ?? (to !== undefined && location.pathname === to);
        return { etiqueta, to, esActivo };
      }),
    [location.pathname],
  );

  // Estilo 1:1 con la pantalla Actividades (sin iconos, mismo padding y rosa #E91E82).
  function renderNavItems(onItemClick?: () => void, isMobile = false) {
    return navItems.map(({ etiqueta, to, esActivo }) => {
      const clases = cn(
        "flex items-center rounded-lg",
        isMobile ? "px-3 py-3" : "gap-2.5 px-3 py-2",
        esActivo
          ? "justify-between bg-[#FDF2F7] font-bold text-[#E91E82] dark:bg-primary/20 dark:text-pink-300"
          : "hover:bg-slate-100 dark:hover:bg-white/10",
      );
      const contenido = (
        <>
          <span>{etiqueta}</span>
          {esActivo && <span aria-hidden="true" className="w-1.5 h-3.5 rounded-full bg-[#E91E82]" />}
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
          className={cn(clases, "cursor-default")}
        >
          {contenido}
        </span>
      );
    });
  }

  const nombreUsuario = user ? `${user.nombre} ${user.apellido}`.trim() : "Mariana FR";

  return (
    <div className="flex min-h-dvh w-full flex-col bg-bg-light text-slate-900 lg:flex-row dark:bg-canvas dark:text-slate-100">
      {/* ================= HEADER MOBILE (igual que Actividades) ================= */}
      <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden dark:border-white/10 dark:bg-surface-low">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={abrirMenu}
            aria-label="Abrir menú de navegación"
            aria-expanded={menuAbierto}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100 dark:text-slate-300 dark:active:bg-white/10"
          >
            <Menu aria-hidden="true" className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E91E82] text-[11px] font-black text-white">
              FR
            </div>
            <div className="leading-none">
              <div className="text-sm font-extrabold text-[#181C26] dark:text-white">MiFR Centro</div>
              <div className="mt-0.5 text-sm font-bold uppercase tracking-wide text-[#BC1266] dark:text-pink-300">
                Propietaria
              </div>
            </div>
          </div>
        </div>
        <ThemeToggle compacto />
      </header>

      {/* ================= DRAWER MOBILE (igual que Actividades) ================= */}
      {menuAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-movil-titulo"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={cerrarMenu}
            className="absolute inset-0 cursor-default bg-black/40"
          />

          <aside ref={drawerRef} className="absolute bottom-0 left-0 top-0 flex w-[280px] flex-col overflow-hidden bg-white shadow-2xl dark:bg-surface-low">
            <div className="flex h-[60px] items-center justify-between border-b border-slate-200 px-4 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E91E82] text-[11px] font-black text-white">
                  FR
                </div>
                <div className="leading-none">
                  <div id="menu-movil-titulo" className="text-sm font-extrabold text-[#181C26] dark:text-white">MiFR Centro</div>
                  <div className="mt-0.5 text-sm font-bold uppercase tracking-wide text-[#BC1266] dark:text-pink-300">
                    Propietaria
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={cerrarMenu}
                aria-label="Cerrar menú"
                data-autofocus
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <nav
              aria-label="Navegación móvil"
              className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              {renderNavItems(cerrarMenu, true)}
            </nav>

            <div className="mt-auto shrink-0 border-t border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-surface-low">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  MR
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{nombreUsuario}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Propietaria</div>
                </div>
              </div>
              <ThemeToggle className="mt-2 w-full px-2 text-sm" />
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-rose-600 dark:text-slate-400 dark:hover:text-pink-300"
              >
                <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ================= SIDEBAR DESKTOP (igual que Actividades) ================= */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white p-4 lg:flex dark:border-white/10 dark:bg-surface-low">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 pb-4 dark:border-white/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E91E82] text-xs font-black text-white">
              FR
            </div>
            <div>
              <div className="text-sm font-extrabold text-[#181C26] dark:text-white">MiFR Centro</div>
              <div className="text-sm font-bold uppercase tracking-wider text-[#BC1266] dark:text-pink-300">
                Propietaria
              </div>
            </div>
          </div>

          <nav aria-label="Administración" className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {renderNavItems()}
          </nav>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white pt-3 dark:border-white/10 dark:bg-surface-low">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                MR
              </div>
              <div className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">{nombreUsuario}</div>
            </div>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Propietaria</span>
          </div>
          <ThemeToggle className="mt-2 w-full px-2 text-sm" />
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-rose-600 dark:text-slate-400 dark:hover:text-pink-300"
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
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
