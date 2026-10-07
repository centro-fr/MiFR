import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import { ITEMS_PROPIETARIA } from "./owner-navigation";
import type { RoleCode } from "@/types/auth";

/** Preferencia de sidebar colapsado en desktop. Solo UI: si falla, se usa expandido. */
const CLAVE_SIDEBAR_COLAPSADO = "mifr:sidebar-colapsado";

/** Etiquetas en español para el rol del bloque inferior del menú. */
const ETIQUETAS_ROL: Record<RoleCode, string> = {
  PROPIETARIA: "Propietaria",
  PROFESORA: "Profesora",
  ALUMNO: "Alumno/a",
  TUTOR: "Tutor/a",
};

interface OwnerLayoutProps {
  children: ReactNode;
}

/** Tooltip shadcn a la derecha: reemplaza el `title` nativo en el sidebar colapsado. */
function ConTooltip({ etiqueta, lado = "right", children }: { etiqueta: string; lado?: "right" | "bottom"; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={lado}>{etiqueta}</TooltipContent>
    </Tooltip>
  );
}

/** Botón discreto para contraer/expandir el sidebar en desktop. */
function BotonColapsar({ colapsado, onToggle }: { colapsado: boolean; onToggle: () => void }) {
  const Icono = colapsado ? PanelLeftOpen : PanelLeftClose;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-expanded={!colapsado}
      aria-controls="sidebar-desktop"
      aria-label={colapsado ? "Expandir menú" : "Contraer menú"}
      className="h-10 w-10 shrink-0 rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-5"
    >
      <Icono aria-hidden="true" className="h-5 w-5" />
    </Button>
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
  // El Sheet de shadcn (Radix) gestiona Escape, trampa de foco, bloqueo de
  // scroll, retorno de foco y la animación de salida: no hay estado manual.
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
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
      // Sobre el fondo vino: texto blanco, hover blanco translúcido, activo
      // en rosa de marca con barra blanca al borde derecho.
      if (!hijos) {
        const clases = cn(
          "relative flex items-center gap-2.5 rounded-lg px-3 text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white",
          isMobile ? "py-3" : "py-2",
          esActivo && "bg-primary font-bold text-white hover:bg-primary hover:text-white",
          esActivo && "justify-between",
          isMobile && "animate-drawer-item",
        );
        const estiloEntrada =
          isMobile ? { animationDelay: `${Math.min(indice, 10) * 22}ms` } : undefined;

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
            {esActivo && (
              <span
                aria-hidden="true"
                className="h-6 w-1 shrink-0 rounded-full bg-white"
              />
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
        "relative flex w-full cursor-pointer items-center rounded-lg text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white",
        isMobile ? "px-3 py-3" : "gap-2 px-3 py-2",
        esActivo && "bg-primary font-bold text-white hover:bg-primary hover:text-white",
        isMobile && "animate-drawer-item",
      );
      const estiloEntrada =
        isMobile ? { animationDelay: `${Math.min(indice, 10) * 22}ms` } : undefined;

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
            {esActivo && (
              <span aria-hidden="true" className="h-6 w-1 shrink-0 rounded-full bg-white" />
            )}
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
                      "relative mt-0.5 flex items-center rounded-lg py-2 pl-[42px] pr-3 text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white",
                      hijo.esActivo && "bg-primary font-bold text-white hover:bg-primary hover:text-white",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{hijo.etiqueta}</span>
                    {hijo.esActivo && (
                      <span aria-hidden="true" className="h-6 w-1 shrink-0 rounded-full bg-white" />
                    )}
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
  // Rol real del bloque inferior (una persona puede tener más de un rol).
  const rolTexto = (user?.roles ?? []).map((rol) => ETIQUETAS_ROL[rol]).join(" · ");

  // Migas de la barra superior: "Inicio" + sección/página según la ruta,
  // derivadas de los ítems del menú (sin lógica nueva de rutas).
  const migas = useMemo(() => {
    const trail: { etiqueta: string; to?: string }[] = [{ etiqueta: "Inicio", to: "/app/dashboard" }];
    for (const item of navItems) {
      if (item.hijos) {
        const hijo = item.hijos.find((h) => h.esActivo);
        if (!hijo) continue;
        trail.push({ etiqueta: item.etiqueta });
        trail.push({ etiqueta: hijo.etiqueta });
        break;
      }
      if (item.esActivo) {
        trail.push({ etiqueta: item.etiqueta });
        break;
      }
    }
    return trail;
  }, [navItems]);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-bg-light text-slate-900 lg:flex-row dark:bg-canvas dark:text-slate-100">
      {/* ================= SIDEBAR DESKTOP (colapsable, vino) ================= */}
      {/* Ocupa toda la altura. Colapsado: solo botón de deslizar + avatar/salir.
          El nav del medio se oculta (fade + desmontaje). Expandido: nav completo.
          El vino es constante en tema claro y oscuro. */}
      <aside
        id="sidebar-desktop"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-white/10 bg-sidebar text-white transition-[width,padding] duration-250 ease-in-out motion-reduce:transition-none lg:flex",
          colapsado ? "w-[76px] px-3 py-4" : "w-70 p-4",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "flex shrink-0 items-center border-b border-white/10 pb-4",
              colapsado ? "flex-col justify-center gap-2" : "gap-2.5",
            )}
          >
            {colapsado ? (
              <ConTooltip etiqueta="Expandir menú (Ctrl+B)">
                <BotonColapsar colapsado={colapsado} onToggle={alternarColapsado} />
              </ConTooltip>
            ) : (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
                  FR
                </div>
                <div className="min-w-0 flex-1 leading-none">
                  <div className="truncate text-sm font-extrabold text-white">MiFR Centro</div>
                </div>
                <ConTooltip etiqueta="Contraer menú (Ctrl+B)" lado="bottom">
                  <BotonColapsar colapsado={colapsado} onToggle={alternarColapsado} />
                </ConTooltip>
              </>
            )}
          </div>

          {/* Colapsado: el nav no se monta (display:none real). Durante el
              fade-out de 180ms sigue montado pero invisible e inerte: fuera
              del tab y de lectores, sin saltos de layout. Al expandir monta
              con fade-in. Solo quedan el botón de deslizar + avatar/salir. */}
          {!navOculto && (
            <nav
              ref={navRef}
              aria-label="Administración"
              inert={colapsado}
              aria-hidden={colapsado}
              className={cn(
                "relative mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-1 text-sm font-semibold transition-opacity duration-150 ease-in-out motion-reduce:transition-none",
                colapsado ? "opacity-0" : "animate-nav-in",
              )}
            >
              {!colapsado && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute right-3 top-0 w-1.5 rounded-full bg-white transition-[transform,height,opacity] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
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
          <div className="flex shrink-0 flex-col items-center gap-2 border-t border-white/10 pt-3">
            <ConTooltip etiqueta={nombreUsuario}>
              <div
                aria-label={nombreUsuario}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white"
              >
                {iniciales}
              </div>
            </ConTooltip>
            <ConTooltip etiqueta="Cerrar sesión">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-5"
              >
                <LogOut aria-hidden="true" className="h-5 w-5" />
              </Button>
            </ConTooltip>
          </div>
        ) : (
          <div className="shrink-0 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
                {iniciales}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-semibold text-white">{nombreUsuario}</div>
                <div className="truncate text-xs font-medium text-pink-200">{rolTexto}</div>
              </div>
            </div>
            <div aria-hidden="true" className="my-3 border-t border-white/10" />
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="-ml-2 flex h-auto min-h-[44px] w-full items-center justify-start gap-2.5 px-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-5"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
              Cerrar sesión
            </Button>
          </div>
        )}
      </aside>

      {/* Columna derecha: barra superior + contenido. El Sheet Root no
          renderiza DOM: envuelve la barra + drawer para que SheetTrigger
          registre la hamburguesa (Radix devuelve el foco ahí al cerrar). */}
      <div className="flex min-w-0 flex-1 flex-col">
      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        {/* ============ BARRA SUPERIOR (56px, sobre el contenido) ============
            Mismo fondo y padding lateral que el contenido. Izquierda: en
            mobile hamburguesa + logo; en desktop migas de pan de la ruta.
            Derecha (siempre): botón de solo ícono para el tema. */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-bg-light px-4 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-canvas">
          <div className="flex items-center gap-3 lg:hidden">
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menú de navegación"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-transform duration-150 active:scale-90 active:bg-slate-100 dark:text-slate-300 dark:active:bg-white/10"
              >
                <Menu aria-hidden="true" className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E91E82] text-xs font-black text-white">
                FR
              </div>
              <div className="leading-none">
                <div className="text-sm font-extrabold text-[#181C26] dark:text-white">MiFR Centro</div>
              </div>
            </div>
          </div>
          <nav aria-label="Migas de pan" className="hidden min-w-0 lg:block">
            <ol className="flex min-w-0 items-center gap-1.5 text-sm">
              {migas.map((miga, indice) => {
                const esUltima = indice === migas.length - 1;
                return (
                  <li key={miga.etiqueta} className="flex min-w-0 items-center gap-1.5">
                    {indice > 0 && (
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                        /
                      </span>
                    )}
                    {esUltima || !miga.to ? (
                      <span
                        aria-current={esUltima ? "page" : undefined}
                        className="truncate font-semibold text-slate-700 dark:text-slate-200"
                      >
                        {miga.etiqueta}
                      </span>
                    ) : (
                      <Link
                        to={miga.to}
                        className="truncate text-slate-400 transition-colors hover:text-[#E91E82] dark:text-slate-500 dark:hover:text-pink-300"
                      >
                        {miga.etiqueta}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="flex shrink-0 items-center">
            <ThemeToggle compacto />
          </div>
        </header>

      {/* ================= DRAWER MOBILE (SheetContent del mismo Sheet) =========
          Radix aporta Escape, trampa de foco, bloqueo de scroll, retorno de
          foco y la animación de salida; el contenido conserva el diseño propio. */}
        <SheetContent
          side="left"
          hideClose
          aria-modal="true"
          overlayClassName="bg-black/40"
          className="flex w-[280px] flex-col gap-0 overflow-hidden border-white/10 bg-sidebar p-0 text-white data-[state=open]:duration-300 data-[state=closed]:duration-200 sm:max-w-[280px] lg:hidden"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
                FR
              </div>
              <div className="leading-none">
                <SheetTitle className="text-sm font-extrabold text-white">
                  MiFR Centro
                </SheetTitle>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cerrarMenu}
              aria-label="Cerrar menú"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white [&_svg]:size-5"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>

          <nav
            aria-label="Navegación móvil"
            className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-sm font-semibold"
          >
            {renderNavItems(cerrarMenu, true)}
          </nav>

          <div className="mt-auto shrink-0 border-t border-white/10 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
                {iniciales}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-semibold text-white">{nombreUsuario}</div>
                <div className="truncate text-xs font-medium text-pink-200">{rolTexto}</div>
              </div>
            </div>
            <div aria-hidden="true" className="my-3 border-t border-white/10" />
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="-ml-2 flex h-auto min-h-[44px] w-full items-center justify-start gap-2.5 px-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-5"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
              Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
    </div>
  );
}
