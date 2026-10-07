import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/utils/cn";
import { ITEMS_PROPIETARIA } from "./owner-navigation";

/** Preferencia de sidebar colapsado en desktop. Solo UI: si falla, se usa expandido. */
const CLAVE_SIDEBAR_COLAPSADO = "mifr:sidebar-colapsado";

interface OwnerLayoutProps {
  children: ReactNode;
}

/** Botón discreto para contraer/expandir el sidebar en desktop. */
function BotonColapsar({ colapsado, onToggle }: { colapsado: boolean; onToggle: () => void }) {
  const Icono = colapsado ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!colapsado}
      aria-controls="sidebar-desktop"
      aria-label={colapsado ? "Expandir menú" : "Contraer menú"}
      title={colapsado ? "Expandir menú (Ctrl+B)" : "Contraer menú (Ctrl+B)"}
      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
    >
      <Icono aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}

export function OwnerLayout({ children }: OwnerLayoutProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Colapsado se lee en el primer render (lazy init): no hay parpadeo al recargar.
  const [colapsado, setColapsado] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLAVE_SIDEBAR_COLAPSADO) === "1";
    } catch {
      return false;
    }
  });
  // `saliendo` mantiene el drawer montado durante la animación de salida.
  const [saliendo, setSaliendo] = useState(false);
  // Nav del medio en desktop: al colapsar hace fade-out (150ms) y recién ahí
  // se desmonta (display:none real: sin saltos, fuera del tab). Al expandir
  // monta directo con fade-in. Nace oculto si la preferencia guardada es colapsado.
  const [navOculto, setNavOculto] = useState<boolean>(colapsado);
  const temporizadorNav = useRef<number | null>(null);
  const location = useLocation();
  // Submenú "Actividades y Horarios" como estado derivado (sin efectos):
  // nace abierto y se reabre solo en rutas hijas; el toggle manual solo vale
  // para la ruta donde se hizo (al cambiar de sección vuelve al default).
  const esRutaHijaActividades =
    location.pathname === "/app/actividades" || location.pathname === "/app/horarios";
  const [subForzado, setSubForzado] = useState<{ ruta: string; abierto: boolean } | null>(null);
  const subActividadesAbierto =
    subForzado !== null && subForzado.ruta === location.pathname
      ? subForzado.abierto
      : esRutaHijaActividades;
  const { user, logout } = useAuth();

  const cerrarMenu = useCallback(() => {
    if (!menuAbierto || saliendo) return;
    setSaliendo(true);
  }, [menuAbierto, saliendo]);
  const abrirMenu = useCallback(() => {
    setSaliendo(false);
    setMenuAbierto(true);
  }, []);

  // Al terminar la salida (230ms) se desmonta el drawer; si el usuario
  // lo reabre antes, la limpieza del efecto cancela el cierre.
  useEffect(() => {
    if (!saliendo) return;
    const timer = window.setTimeout(() => {
      setMenuAbierto(false);
      setSaliendo(false);
    }, 230);
    return () => window.clearTimeout(timer);
  }, [saliendo]);
  const handleLogout = useCallback(() => {
    setMenuAbierto(false);
    void logout();
  }, [logout]);

  // Único punto que cambia el colapsado (botón + Ctrl/Cmd+B): acá se
  // orquesta también el fade del nav, sin efectos (el lint del repo no
  // permite set-state-in-effect). Expandir monta al instante; colapsar
  // espera 180ms (fade-out de 150ms) antes de desmontar.
  const alternarColapsado = useCallback(() => {
    const siguiente = !colapsado;
    setColapsado(siguiente);
    try {
      localStorage.setItem(CLAVE_SIDEBAR_COLAPSADO, siguiente ? "1" : "0");
    } catch {
      // Almacenamiento no disponible (modo privado, cookies bloqueadas):
      // la preferencia solo vive en esta sesión.
    }
    if (temporizadorNav.current !== null) {
      window.clearTimeout(temporizadorNav.current);
      temporizadorNav.current = null;
    }
    if (siguiente) {
      temporizadorNav.current = window.setTimeout(() => setNavOculto(true), 180);
    } else {
      setNavOculto(false);
    }
  }, [colapsado]);

  // Limpieza del temporizador si el layout se desmonta a mitad del fade.
  useEffect(
    () => () => {
      if (temporizadorNav.current !== null) window.clearTimeout(temporizadorNav.current);
    },
    [],
  );

  // Atajo Ctrl/Cmd + B para alternar el sidebar. Se ignora al escribir en campos.
  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      const destino = evento.target as HTMLElement | null;
      const escribiendo =
        destino !== null &&
        (destino.tagName === "INPUT" ||
          destino.tagName === "TEXTAREA" ||
          destino.tagName === "SELECT" ||
          destino.isContentEditable);
      if (escribiendo) return;
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "b") {
        evento.preventDefault();
        alternarColapsado();
      }
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [alternarColapsado]);

  // Drawer mobile como diálogo accesible: Escape, trampa de foco,
  // foco inicial, bloqueo de scroll y retorno de foco al cerrar.
  const drawerRef = useRef<HTMLElement>(null);
  useDialogA11y({ active: menuAbierto, onClose: cerrarMenu, dialogRef: drawerRef });

  const navItems = useMemo(
    () =>
      ITEMS_PROPIETARIA.map((item) => {
        if (item.hijos) {
          const hijos = item.hijos.map((hijo) => ({
            ...hijo,
            esActivo: location.pathname === hijo.to,
          }));
          return { ...item, hijos, esActivo: hijos.some((hijo) => hijo.esActivo) };
        }
        return {
          ...item,
          hijos: undefined as undefined,
          esActivo: item.activo ?? (item.to !== undefined && location.pathname === item.to),
        };
      }),
    [location.pathname],
  );

  // Barrita activa deslizante (solo desktop expandido): un único elemento
  // absoluto que sigue al ítem activo con translateY + altura animados.
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const [indicador, setIndicador] = useState({ y: 0, h: 0, visible: false });

  const registrarItem = useCallback(
    (etiqueta: string) => (elemento: HTMLElement | null) => {
      if (elemento) itemRefs.current.set(etiqueta, elemento);
      else itemRefs.current.delete(etiqueta);
    },
    [],
  );

  const actualizarIndicador = useCallback(() => {
    const nav = navRef.current;
    if (!nav || colapsado) {
      setIndicador((anterior) => (anterior.visible ? { ...anterior, visible: false } : anterior));
      return;
    }
    // La hoja activa puede ser un ítem simple o una hija del submenú.
    const hojas: { etiqueta: string; to?: string; esActivo: boolean }[] = navItems.flatMap(
      (item) =>
        item.hijos
          ? item.hijos
          : [{ etiqueta: item.etiqueta, to: item.to, esActivo: item.esActivo }],
    );
    const hojaActiva = hojas.find((hoja) => hoja.esActivo);
    const elemento = hojaActiva
      ? itemRefs.current.get(hojaActiva.to ?? hojaActiva.etiqueta)
      : undefined;
    if (!elemento) {
      setIndicador((anterior) => (anterior.visible ? { ...anterior, visible: false } : anterior));
      return;
    }
    // Pastilla con inset vertical de 6px respecto del ítem (como la barrita anterior).
    const h = Math.max(elemento.offsetHeight - 12, 12);
    const y = elemento.offsetTop + 6;
    setIndicador((anterior) =>
      anterior.visible && anterior.y === y && anterior.h === h ? anterior : { y, h, visible: true },
    );
  }, [navItems, colapsado]);

  // Medición sincrónica antes del paint: en carga/recarga la barrita ya nace
  // en su posición, sin saltar desde arriba.
  useLayoutEffect(() => {
    actualizarIndicador();
  }, [actualizarIndicador]);

  // Recalcula ante cambios de tamaño: ventana, colapso/expansión, carga de fuentes.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(() => actualizarIndicador());
    observador.observe(nav);
    return () => observador.disconnect();
  }, [actualizarIndicador]);

  // Nav con íconos (los define owner-navigation): filas completas con texto.
  // En desktop colapsado el nav directamente no se monta (ver navOculto):
  // no hay íconos del medio, solo el botón de deslizar + los 3 de abajo.
  // En mobile los ítems entran en cascada sutil al abrir el drawer.
  function renderNavItems(onItemClick?: () => void, isMobile = false) {
    return navItems.map(({ etiqueta, icono: Icono, to, esActivo, hijos }, indice) => {
      // Ítem simple (hoja): igual que antes, con clave única por ruta.
      if (!hijos) {
        const clases = cn(
          "flex items-center gap-2.5 rounded-lg px-3 transition-colors duration-200",
          isMobile ? "py-3" : "py-2",
          esActivo
            ? "bg-[#FDF2F7] font-bold text-[#E91E82] dark:bg-primary/20 dark:text-pink-300"
            : "hover:bg-slate-100 dark:hover:bg-white/10",
          esActivo && "justify-between",
          isMobile && !saliendo && "animate-drawer-item",
        );
        const estiloEntrada =
          isMobile && !saliendo ? { animationDelay: `${Math.min(indice, 10) * 22}ms` } : undefined;

        return to ? (
          <Link
            key={etiqueta}
            to={to}
            onClick={onItemClick}
            ref={!isMobile ? registrarItem(to ?? etiqueta) : undefined}
            aria-current={esActivo ? "page" : undefined}
            className={clases}
            style={estiloEntrada}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Icono aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="truncate">{etiqueta}</span>
            </span>
            {esActivo && isMobile && (
              <span aria-hidden="true" className="w-1.5 h-3.5 shrink-0 rounded-full bg-[#E91E82]" />
            )}
          </Link>
        ) : (
          <span
            key={etiqueta}
            ref={!isMobile ? registrarItem(to ?? etiqueta) : undefined}
            title="Próximamente"
            className={cn(clases, "cursor-default")}
            style={estiloEntrada}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Icono aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="truncate">{etiqueta}</span>
            </span>
          </span>
        );
      }

      // Grupo desplegable ("Actividades y Horarios").
      const clasesGrupo = cn(
        "flex w-full cursor-pointer items-center rounded-lg transition-colors duration-200",
        isMobile ? "px-3 py-3" : "gap-2 px-3 py-2",
        esActivo
          ? "bg-[#FDF2F7] font-bold text-[#E91E82] dark:bg-primary/20 dark:text-pink-300"
          : "hover:bg-slate-100 dark:hover:bg-white/10",
        isMobile && !saliendo && "animate-drawer-item",
      );
      const estiloEntrada =
        isMobile && !saliendo ? { animationDelay: `${Math.min(indice, 10) * 22}ms` } : undefined;

      return (
        <div key={etiqueta}>
          <button
            type="button"
            onClick={() =>
              setSubForzado({ ruta: location.pathname, abierto: !subActividadesAbierto })
            }
            aria-expanded={subActividadesAbierto}
            className={clasesGrupo}
            style={estiloEntrada}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <Icono aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="truncate tracking-tight">{etiqueta}</span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                subActividadesAbierto && "rotate-180",
              )}
            />
          </button>
          {/* Altura animada con el truco grid-rows 0fr→1fr: sin medir nada en JS.
              `inert` cerrado saca a las hijas del orden de tab sin romper la
              animación (siguen en el DOM colapsado). */}
          <div
            inert={!subActividadesAbierto}
            className={cn(
              "grid transition-[grid-template-rows] duration-250 ease-in-out motion-reduce:transition-none",
              subActividadesAbierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <ul className="min-h-0 overflow-hidden">
              {hijos.map((hijo) => (
                <li key={hijo.to}>
                  <Link
                    to={hijo.to}
                    onClick={onItemClick}
                    ref={!isMobile ? registrarItem(hijo.to) : undefined}
                    aria-current={hijo.esActivo ? "page" : undefined}
                    className={cn(
                      "mt-0.5 flex items-center rounded-lg py-2 pl-[42px] pr-3 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-white/10",
                      hijo.esActivo &&
                        "bg-[#FDF2F7] font-bold text-[#E91E82] dark:bg-primary/20 dark:text-pink-300",
                    )}
                  >
                    <span className="truncate">{hijo.etiqueta}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    });
  }

  const nombreUsuario = user ? `${user.nombre} ${user.apellido}`.trim() : "";
  const iniciales = user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase() : "";

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
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-transform duration-150 active:scale-90 active:bg-slate-100 dark:text-slate-300 dark:active:bg-white/10"
          >
            <Menu aria-hidden="true" className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E91E82] text-xs font-black text-white">
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
            className={cn(
              "absolute inset-0 cursor-default bg-black/40",
              saliendo ? "animate-overlay-out" : "animate-overlay-in",
            )}
          />

          <aside
            ref={drawerRef}
            className={cn(
              "absolute bottom-0 left-0 top-0 flex w-[280px] flex-col overflow-hidden bg-white shadow-2xl dark:bg-surface-low",
              saliendo ? "animate-drawer-out" : "animate-drawer-in",
            )}
          >
            <div className="flex h-[60px] items-center justify-between border-b border-slate-200 px-4 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E91E82] text-xs font-black text-white">
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
                  {iniciales}
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

      {/* ================= SIDEBAR DESKTOP (colapsable) ================= */}
      {/* Colapsado: solo botón de deslizar + avatar/tema/salir. El nav del
          medio se oculta (fade + desmontaje). Expandido: nav completo. */}
      <aside
        id="sidebar-desktop"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width,padding] duration-250 ease-in-out motion-reduce:transition-none lg:flex dark:border-white/10 dark:bg-surface-low",
          colapsado ? "w-[76px] px-3 py-4" : "w-70 p-4",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "flex shrink-0 items-center border-b border-slate-100 pb-4 dark:border-white/10",
              colapsado ? "flex-col justify-center gap-2" : "gap-2.5",
            )}
          >
            {colapsado ? (
              <BotonColapsar colapsado={colapsado} onToggle={alternarColapsado} />
            ) : (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E91E82] text-xs font-black text-white">
                  FR
                </div>
                <div className="min-w-0 flex-1 leading-none">
                  <div className="truncate text-sm font-extrabold text-[#181C26] dark:text-white">MiFR Centro</div>
                  <div className="mt-0.5 truncate text-sm font-bold uppercase tracking-wider text-[#BC1266] dark:text-pink-300">
                    Propietaria
                  </div>
                </div>
                <BotonColapsar colapsado={colapsado} onToggle={alternarColapsado} />
              </>
            )}
          </div>

          {/* Colapsado: el nav no se monta (display:none real). Durante el
              fade-out de 180ms sigue montado pero invisible e inerte: fuera
              del tab y de lectores, sin saltos de layout. Al expandir monta
              con fade-in. Solo quedan el botón de deslizar + los 3 de abajo. */}
          {!navOculto && (
            <nav
              ref={navRef}
              aria-label="Administración"
              inert={colapsado}
              aria-hidden={colapsado}
              className={cn(
                "relative mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-1 text-sm font-semibold text-slate-600 transition-opacity duration-150 ease-in-out motion-reduce:transition-none dark:text-slate-300",
                colapsado ? "opacity-0" : "animate-nav-in",
              )}
            >
              {!colapsado && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute right-3 top-0 w-1.5 rounded-full bg-[#E91E82] transition-[transform,height,opacity] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                    indicador.visible ? "opacity-100" : "opacity-0",
                  )}
                  style={{ transform: `translateY(${indicador.y}px)`, height: indicador.h }}
                />
              )}
              {renderNavItems(undefined, false)}
            </nav>
          )}
        </div>

        {colapsado ? (
          <div className="flex shrink-0 flex-col items-center gap-2 border-t border-slate-100 bg-white pt-3 dark:border-white/10 dark:bg-surface-low">
            <div
              title={nombreUsuario}
              aria-label={nombreUsuario}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              {iniciales}
            </div>
            <ThemeToggle compacto />
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-pink-300"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="shrink-0 border-t border-slate-100 bg-white pt-3 dark:border-white/10 dark:bg-surface-low">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {iniciales}
                </div>
                <div className="truncate text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">{nombreUsuario}</div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-400">Propietaria</span>
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
        )}
      </aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      {/* Con key por ruta el contenido re-activa la animación de entrada al navegar.
          Solo el main se anima: el sidebar queda fijo, sin parpadeos ni saltos. */}
      <main
        key={location.pathname}
        className="flex w-full min-w-0 flex-1 animate-page-enter flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
      >
        {children}
      </main>
    </div>
  );
}
