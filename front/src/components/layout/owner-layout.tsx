import { useState, type ComponentProps, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import { useOwnerNavigation, type ItemConEstado, type Miga } from "./use-owner-navigation";
import type { RoleCode } from "@/types/auth";

/** Cookie con la que el Sidebar de shadcn recuerda si quedó contraído (solo UI). */
const COOKIE_SIDEBAR = "sidebar_state";

/** Etiquetas en español para el rol del bloque inferior del menú. */
const ETIQUETAS_ROL: Record<RoleCode, string> = {
  PROPIETARIA: "Propietaria",
  PROFESORA: "Profesora",
  ALUMNO: "Alumno/a",
  TUTOR: "Tutor/a",
};

/** Ítem activo en rosa de marca; el resto de estados (hover, foco) los resuelve el Sidebar. */
const CLASES_ITEM =
  "h-11 pointer-fine:h-9 [&>svg]:size-5 data-[active=true]:bg-sidebar-primary data-[active=true]:font-bold data-[active=true]:text-sidebar-primary-foreground";

function leerSidebarAbierto(): boolean {
  try {
    return !document.cookie.split("; ").includes(`${COOKIE_SIDEBAR}=false`);
  } catch {
    return true;
  }
}

function LogoMarca() {
  return (
    <div
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-black text-sidebar-primary-foreground"
    >
      FR
    </div>
  );
}

/** Props de entrada en cascada del drawer mobile (el delay crece con el índice del ítem). */
type EntradaEscalonada = Pick<ComponentProps<"li">, "className" | "style">;

function entradaEscalonada(indice: number): EntradaEscalonada {
  return { className: "animate-drawer-item", style: { animationDelay: `${Math.min(indice, 10) * 22}ms` } };
}

interface PropsItem {
  item: ItemConEstado;
  alNavegar: () => void;
  entrada?: EntradaEscalonada;
}

function ItemSimple({ item, alNavegar, entrada }: PropsItem) {
  const Icono = item.icono;
  if (!item.to) {
    return (
      <SidebarMenuItem {...entrada}>
        <SidebarMenuButton aria-disabled="true" tooltip={`${item.etiqueta} (próximamente)`} className={CLASES_ITEM}>
          <Icono aria-hidden="true" />
          <span>{item.etiqueta}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
  return (
    <SidebarMenuItem {...entrada}>
      <SidebarMenuButton asChild isActive={item.esActivo} tooltip={item.etiqueta} className={CLASES_ITEM}>
        <Link to={item.to} onClick={alNavegar} aria-current={item.esActivo ? "page" : undefined}>
          <Icono aria-hidden="true" />
          <span>{item.etiqueta}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** Contraído no hay lugar para el submenú: las hijas salen en un menú flotante al costado. */
function GrupoContraido({ item }: { item: ItemConEstado }) {
  const Icono = item.icono;
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton isActive={item.esActivo} tooltip={item.etiqueta} className={CLASES_ITEM}>
            <Icono aria-hidden="true" />
            <span>{item.etiqueta}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          {item.hijos?.map((hijo) => (
            <DropdownMenuItem key={hijo.to} asChild>
              <Link to={hijo.to} aria-current={hijo.esActivo ? "page" : undefined}>
                {hijo.etiqueta}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function GrupoDesplegable({ item, alNavegar, entrada }: PropsItem) {
  const { pathname } = useLocation();
  // Estado derivado (sin efectos): nace abierto en rutas hijas y el toggle manual
  // solo vale para la ruta donde se hizo; al cambiar de sección vuelve al default.
  const [forzado, setForzado] = useState<{ ruta: string; abierto: boolean } | null>(null);
  const abierto = forzado?.ruta === pathname ? forzado.abierto : item.esActivo;
  const Icono = item.icono;

  return (
    <SidebarMenuItem {...entrada}>
      <SidebarMenuButton
        type="button"
        aria-expanded={abierto}
        onClick={() => setForzado({ ruta: pathname, abierto: !abierto })}
        className={CLASES_ITEM}
      >
        <Icono aria-hidden="true" />
        <span>{item.etiqueta}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("ml-auto transition-transform duration-200 motion-reduce:transition-none", abierto && "rotate-180")}
        />
      </SidebarMenuButton>
      {/* Altura animada con grid-rows 0fr→1fr; `inert` cerrado saca a las hijas del tab. */}
      <div
        inert={!abierto}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none",
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <SidebarMenuSub className="min-h-0 overflow-hidden py-0">
          {item.hijos?.map((hijo) => (
            <SidebarMenuSubItem key={hijo.to}>
              <SidebarMenuSubButton
                asChild
                isActive={hijo.esActivo}
                className="h-11 pointer-fine:h-8 data-[active=true]:bg-sidebar-primary data-[active=true]:font-bold data-[active=true]:text-sidebar-primary-foreground"
              >
                <Link to={hijo.to} onClick={alNavegar} aria-current={hijo.esActivo ? "page" : undefined}>
                  <span>{hijo.etiqueta}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </div>
    </SidebarMenuItem>
  );
}

function NavegacionPrincipal({ items }: { items: ItemConEstado[] }) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const contraido = state === "collapsed" && !isMobile;
  const alNavegar = () => setOpenMobile(false);

  return (
    <SidebarGroup>
      <SidebarMenu aria-label="Administración">
        {items.map((item, indice) => {
          const entrada = isMobile ? entradaEscalonada(indice) : undefined;
          if (!item.hijos) return <ItemSimple key={item.etiqueta} item={item} alNavegar={alNavegar} entrada={entrada} />;
          return contraido ? (
            <GrupoContraido key={item.etiqueta} item={item} />
          ) : (
            <GrupoDesplegable key={item.etiqueta} item={item} alNavegar={alNavegar} entrada={entrada} />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function BloqueUsuario() {
  const { user, logout } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const nombre = user ? `${user.nombre} ${user.apellido}`.trim() : "";
  const iniciales = user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase() : "";
  // Una persona puede tener más de un rol.
  const rolTexto = (user?.roles ?? []).map((rol) => ETIQUETAS_ROL[rol]).join(" · ");

  const handleLogout = () => {
    setOpenMobile(false);
    void logout();
  };

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2.5 px-0.5 py-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-bold">
              {iniciales}
            </div>
            <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold">{nombre}</div>
              <div className="truncate text-sm font-medium text-pink-200">{rolTexto}</div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" hidden={state !== "collapsed" || isMobile}>
          {nombre}
        </TooltipContent>
      </Tooltip>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Cerrar sesión" onClick={handleLogout} className={CLASES_ITEM}>
            <LogOut aria-hidden="true" />
            <span>Cerrar sesión</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

function MenuLateral({ items }: { items: ItemConEstado[] }) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <LogoMarca />
          <span className="truncate text-sm font-extrabold group-data-[collapsible=icon]:hidden">MiFR Centro</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavegacionPrincipal items={items} />
      </SidebarContent>
      <BloqueUsuario />
      <SidebarRail />
    </Sidebar>
  );
}

function MigasDePan({ migas }: { migas: Miga[] }) {
  return (
    <nav aria-label="Migas de pan" className="hidden min-w-0 md:block">
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
                  className="truncate text-slate-400 transition-colors hover:text-primary dark:text-slate-500 dark:hover:text-pink-300"
                >
                  {miga.etiqueta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Barra superior: botón del menú (drawer en mobile, contraer en desktop), migas y tema. */
function BarraSuperior({ migas }: { migas: Miga[] }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-light px-4 sm:px-6 lg:px-8 dark:bg-canvas">
      <SidebarTrigger className="-ml-2 h-11 w-11 shrink-0 text-slate-500 pointer-fine:h-9 pointer-fine:w-9 dark:text-slate-300" />
      <div className="flex items-center gap-2.5 md:hidden">
        <LogoMarca />
        <span className="text-sm font-extrabold text-dark dark:text-white">MiFR Centro</span>
      </div>
      <MigasDePan migas={migas} />
      <div className="ml-auto flex shrink-0 items-center">
        <ThemeToggle compacto />
      </div>
    </header>
  );
}

interface OwnerLayoutProps {
  children: ReactNode;
}

export function OwnerLayout({ children }: OwnerLayoutProps) {
  const { pathname } = useLocation();
  const { items, migas } = useOwnerNavigation();
  // Solo importa en el primer render: el Provider recuerda el estado después.
  const [abiertoInicial] = useState(leerSidebarAbierto);

  return (
    <SidebarProvider
      defaultOpen={abiertoInicial}
      className="bg-bg-light text-foreground dark:bg-canvas"
    >
      <MenuLateral items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior migas={migas} />
        {/* Con key por ruta el contenido re-activa la animación de entrada al navegar;
            el sidebar queda fijo, sin parpadeos. */}
        <main
          key={pathname}
          className="flex w-full min-w-0 flex-1 animate-page-enter flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
