import { Fragment, useId, useState, type ComponentProps, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CampanaNotificaciones } from "@/features/notificaciones/components/campana-notificaciones";
import { LogoFr } from "@/components/marca/logo-fr";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import { useContadoresMenu } from "./use-contadores-menu";
import { useOwnerNavigation, type ItemConEstado, type Miga } from "./use-owner-navigation";
import type { RoleCode } from "@/types/auth";

/** Cookie con la que el Sidebar de shadcn recuerda si quedó contraído (solo UI). */
const COOKIE_SIDEBAR = "sidebar_state";

/** Ítem de navegación con estilo refinado según diseño oscuro */
const CLASES_ITEM =
  "h-11 pointer-fine:h-9.5 rounded-xl px-3 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white [&>svg]:size-5 [&>svg]:text-slate-400 hover:[&>svg]:text-white data-[active=true]:bg-[#281525] data-[active=true]:text-white data-[active=true]:font-bold data-[active=true]:[&>svg]:text-primary group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden transition-colors";

function leerSidebarAbierto(): boolean {
  try {
    return !document.cookie.split("; ").includes(`${COOKIE_SIDEBAR}=false`);
  } catch {
    return true;
  }
}

function LogoMarca() {
  return <LogoFr className="size-8" />;
}

/** Props de entrada en cascada del drawer mobile. */
type EntradaEscalonada = Pick<ComponentProps<"li">, "className" | "style">;

const PASO_CASCADA_MS = 15;
const ITEMS_EN_CASCADA = 6;

function entradaEscalonada(indice: number): EntradaEscalonada {
  return { className: "animate-drawer-item", style: { animationDelay: `${Math.min(indice, ITEMS_EN_CASCADA) * PASO_CASCADA_MS}ms` } };
}

/**
 * Globo de notificación / alerta junto a una opción (en rosa de marca).
 * Muestra un signo de exclamación cuando hay pendientes que requieren atención
 * (transferencias por verificar o rendición de efectivo).
 */
function Contador({ valor, className }: { valor?: number; className?: string }) {
  if (!valor || valor <= 0) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "size-5 flex items-center justify-center rounded-full bg-primary text-white text-xs font-black shadow-xs shrink-0 select-none",
          className,
        )}
      >
        !
      </span>
      <span className="sr-only">, {valor === 1 ? "1 pendiente por verificar" : `${valor} pendientes por verificar`}</span>
    </>
  );
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
          <span className="flex-1 truncate">{item.etiqueta}</span>
          <Contador valor={item.contador} />
          {item.esActivo && (
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary shrink-0 ml-auto group-data-[collapsible=icon]:hidden"
            />
          )}
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
          <SidebarMenuButton isActive={item.esActivo} tooltip={item.etiqueta} className={cn(CLASES_ITEM, "relative")}>
            <Icono aria-hidden="true" />
            <span>{item.etiqueta}</span>
            <Contador valor={item.contador} className="absolute top-0.5 right-0.5 size-4 text-[10px]" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          {item.to && (
            <>
              <DropdownMenuItem asChild>
                <Link to={item.to} className="font-bold">
                  {item.etiqueta}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {item.hijos?.map((hijo) => (
            <DropdownMenuItem key={hijo.to} asChild>
              <Link to={hijo.to} aria-current={hijo.esActivo ? "page" : undefined}>
                {hijo.etiqueta}
                <Contador valor={hijo.contador} className="ml-auto" />
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function Flecha({ abierto, className }: { abierto: boolean; className?: string }) {
  return (
    <ChevronDown
      aria-hidden="true"
      className={cn("transition-transform duration-200 motion-reduce:transition-none", abierto && "rotate-180", className)}
    />
  );
}

function CabeceraConPantalla({
  item,
  to,
  abierto,
  alNavegar,
  alternar,
}: {
  item: ItemConEstado;
  to: string;
  abierto: boolean;
  alNavegar: () => void;
  alternar: () => void;
}) {
  const Icono = item.icono;
  const enSuPantalla = item.esActivo && !item.hijos?.some((hijo) => hijo.esActivo);
  return (
    <>
      <SidebarMenuButton asChild isActive={enSuPantalla} className={cn(CLASES_ITEM, "pr-11")}>
        <Link to={to} onClick={alNavegar} aria-current={enSuPantalla ? "page" : undefined}>
          <Icono aria-hidden="true" />
          <span className="flex-1 truncate">{item.etiqueta}</span>
          {!abierto && <Contador valor={item.contador} className="ml-auto" />}
        </Link>
      </SidebarMenuButton>
      <SidebarMenuAction
        type="button"
        aria-expanded={abierto}
        aria-label={abierto ? `Plegar ${item.etiqueta}` : `Desplegar ${item.etiqueta}`}
        onClick={alternar}
        className="top-1 right-1 size-9 rounded-md peer-data-[size=default]/menu-button:top-1 pointer-fine:size-7 [&>svg]:size-4 text-slate-400 hover:text-white"
      >
        <Flecha abierto={abierto} />
      </SidebarMenuAction>
    </>
  );
}

function CabeceraSinPantalla({ item, abierto, alternar }: { item: ItemConEstado; abierto: boolean; alternar: () => void }) {
  const Icono = item.icono;
  return (
    <SidebarMenuButton type="button" aria-expanded={abierto} onClick={alternar} className={CLASES_ITEM}>
      <Icono aria-hidden="true" />
      <span className="flex-1 truncate">{item.etiqueta}</span>
      {!abierto && <Contador valor={item.contador} className="ml-auto" />}
      <Flecha abierto={abierto} className={cn((abierto || !item.contador) && "ml-auto")} />
    </SidebarMenuButton>
  );
}

function GrupoDesplegable({ item, alNavegar, entrada }: PropsItem) {
  const { pathname } = useLocation();
  const [forzado, setForzado] = useState<{ ruta: string; abierto: boolean } | null>(null);
  const abierto = forzado?.ruta === pathname ? forzado.abierto : item.esActivo;
  const alternar = () => setForzado({ ruta: pathname, abierto: !abierto });

  return (
    <SidebarMenuItem {...entrada}>
      {item.to ? (
        <CabeceraConPantalla item={item} to={item.to} abierto={abierto} alNavegar={alNavegar} alternar={alternar} />
      ) : (
        <CabeceraSinPantalla item={item} abierto={abierto} alternar={alternar} />
      )}
      <div
        inert={!abierto}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none",
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <SidebarMenuSub className="min-h-0 overflow-hidden py-1 border-white/10 ml-4">
          {item.hijos?.map((hijo) => (
            <SidebarMenuSubItem key={hijo.to}>
              <SidebarMenuSubButton
                asChild
                isActive={hijo.esActivo}
                className="h-auto min-h-9 py-1.5 leading-tight rounded-lg text-slate-300 hover:text-white hover:bg-white/5 data-[active=true]:bg-primary/20 data-[active=true]:text-white data-[active=true]:font-bold"
              >
                <Link to={hijo.to} onClick={alNavegar} aria-current={hijo.esActivo ? "page" : undefined}>
                  <span className="truncate">{hijo.etiqueta}</span>
                  <Contador valor={hijo.contador} className="ml-auto" />
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </div>
    </SidebarMenuItem>
  );
}

interface SeccionDelMenu {
  titulo?: string;
  items: ItemConEstado[];
  desde: number;
}

function agruparPorSeccion(items: ItemConEstado[]): SeccionDelMenu[] {
  const secciones: SeccionDelMenu[] = [];
  items.forEach((item, indice) => {
    const ultima = secciones.at(-1);
    if (ultima && ultima.titulo === item.seccion) ultima.items.push(item);
    else secciones.push({ titulo: item.seccion, items: [item], desde: indice });
  });
  return secciones;
}

interface PropsSeccion {
  seccion: SeccionDelMenu;
  contraido: boolean;
  isMobile: boolean;
  alNavegar: () => void;
}

function SeccionMenu({ seccion, contraido, isMobile, alNavegar }: PropsSeccion) {
  const idTitulo = useId();
  return (
    <SidebarGroup className="py-1">
      {seccion.titulo && !contraido && (
        <SidebarGroupLabel
          id={idTitulo}
          className="text-[11px] font-bold tracking-wider uppercase text-slate-400/90 px-3"
        >
          {seccion.titulo}
        </SidebarGroupLabel>
      )}
      <SidebarMenu aria-labelledby={seccion.titulo && !contraido ? idTitulo : undefined}>
        {seccion.items.map((item, indice) => {
          const entrada = isMobile ? entradaEscalonada(seccion.desde + indice) : undefined;
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

function NavegacionPrincipal({ items }: { items: ItemConEstado[] }) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const contraido = state === "collapsed" && !isMobile;
  const alNavegar = () => setOpenMobile(false);

  return (
    <nav aria-label="Menú principal" className="py-1">
      {agruparPorSeccion(items).map((seccion, indice) => (
        <Fragment key={seccion.titulo ?? "sin-seccion"}>
          {indice > 0 && <SidebarSeparator className="my-1.5 pointer-events-none border-white/5" />}
          <SeccionMenu seccion={seccion} contraido={contraido} isMobile={isMobile} alNavegar={alNavegar} />
        </Fragment>
      ))}
    </nav>
  );
}

/** Contraer/expandir el menú en desktop. */
function BotonColapsarMenu() {
  const { state, isMobile, toggleSidebar } = useSidebar();
  if (isMobile) return null;

  const contraido = state === "collapsed";
  const Icono = contraido ? PanelLeftOpen : PanelLeftClose;
  const etiqueta = contraido ? "Expandir menú" : "Contraer menú";
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={toggleSidebar}
          aria-expanded={!contraido}
          tooltip={`${etiqueta} (Ctrl+B)`}
          aria-label={etiqueta}
          className={cn(
            CLASES_ITEM,
            "w-fit text-slate-400 hover:text-white group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center!",
          )}
        >
          <Icono aria-hidden="true" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Switch de roles Propietaria / Profesora en el header del menú */
function SwitchRoles({
  roles,
  rolActivo,
  onCambiarRol,
}: {
  roles: readonly RoleCode[];
  rolActivo: RoleCode;
  onCambiarRol: (rol: RoleCode) => void;
}) {
  const { state } = useSidebar();
  if (!roles.includes("PROPIETARIA") || !roles.includes("PROFESORA") || state === "collapsed") {
    return null;
  }

  return (
    <div className="px-3 pt-3 pb-1 group-data-[collapsible=icon]:hidden">
      <div className="grid grid-cols-2 p-1 bg-[#1a1f2c] rounded-xl border border-white/5 gap-1">
        <button
          type="button"
          onClick={() => onCambiarRol("PROPIETARIA")}
          className={cn(
            "py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer",
            rolActivo === "PROPIETARIA"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-400 hover:text-white",
          )}
        >
          Propietaria
        </button>
        <button
          type="button"
          onClick={() => onCambiarRol("PROFESORA")}
          className={cn(
            "py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer",
            rolActivo === "PROFESORA"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-400 hover:text-white",
          )}
        >
          Profesora
        </button>
      </div>
    </div>
  );
}

/** Bloque de usuario al pie del menú con avatar, nombre, email y botón de logout a la derecha */
function BloqueUsuario() {
  const { user, logout } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const nombre = user ? `${user.nombre} ${user.apellido}`.trim() : "";
  const iniciales = user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase() : "";
  const email = user?.email ?? "";

  const handleLogout = () => {
    setOpenMobile(false);
    void logout();
  };

  return (
    <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
      <div className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-xs">
              {iniciales}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" hidden={state !== "collapsed" || isMobile}>
            <div>{nombre}</div>
            <div className="text-xs text-muted-foreground">{email}</div>
          </TooltipContent>
        </Tooltip>

        <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
          <div className="truncate text-sm font-bold text-white">{nombre}</div>
          <div className="truncate text-xs text-slate-400 mt-0.5">{email}</div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors group-data-[collapsible=icon]:hidden cursor-pointer"
            >
              <LogOut aria-hidden="true" className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Cerrar sesión</TooltipContent>
        </Tooltip>
      </div>
    </SidebarFooter>
  );
}

function MenuLateral({
  items,
  roles,
  rolActivo,
  onCambiarRol,
}: {
  items: ItemConEstado[];
  roles: readonly RoleCode[];
  rolActivo: RoleCode;
  onCambiarRol: (rol: RoleCode) => void;
}) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-14 flex flex-row items-center border-b border-sidebar-border px-3.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <LogoMarca />
          <span className="truncate text-base font-black tracking-tight text-white group-data-[collapsible=icon]:hidden">
            MiFR
          </span>
        </div>
      </SidebarHeader>

      <SwitchRoles roles={roles} rolActivo={rolActivo} onCambiarRol={onCambiarRol} />

      <SidebarContent>
        <NavegacionPrincipal items={items} />
      </SidebarContent>

      <SidebarGroup className="py-0 px-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:py-0">
        <BotonColapsarMenu />
      </SidebarGroup>

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

/** Barra superior: botón mobile, logo, migas de pan, notificaciones y alternar tema */
function BarraSuperior({ migas }: { migas: Miga[] }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-light px-4 sm:px-6 lg:px-8 dark:bg-canvas">
      <SidebarTrigger className="-ml-2 h-11 w-11 shrink-0 text-slate-500 md:hidden dark:text-slate-300" />
      <div className="flex items-center gap-2.5 md:hidden">
        <LogoMarca />
        <span className="text-sm font-extrabold text-dark dark:text-white">MiFR Centro</span>
      </div>
      <MigasDePan migas={migas} />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <CampanaNotificaciones />
        <ThemeToggle compacto />
      </div>
    </header>
  );
}

interface OwnerLayoutProps {
  children: ReactNode;
}

// Layout de la app autenticada con soporte para switch de roles
export function OwnerLayout({ children }: OwnerLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { roles } = usePermissions();

  // Detecta si la ruta actual es propia de Profesora
  const esRutaProfesora = pathname.startsWith("/app/hoy") || pathname.startsWith("/app/mis-clases");
  const [rolManual, setRolManual] = useState<RoleCode | null>(null);

  const rolActivo: RoleCode =
    rolManual ?? (esRutaProfesora && roles.includes("PROFESORA") ? "PROFESORA" : "PROPIETARIA");

  const cambiarRol = (nuevoRol: RoleCode) => {
    setRolManual(nuevoRol);
    if (nuevoRol === "PROFESORA" && !pathname.startsWith("/app/hoy") && !pathname.startsWith("/app/mis-clases")) {
      navigate("/app/hoy");
    } else if (nuevoRol === "PROPIETARIA" && (pathname.startsWith("/app/hoy") || pathname.startsWith("/app/mis-clases"))) {
      navigate("/app/dashboard");
    }
  };

  const contadores = useContadoresMenu();
  const { items, migas } = useOwnerNavigation(contadores, roles, rolActivo);
  const [abiertoInicial] = useState(leerSidebarAbierto);

  return (
    <SidebarProvider
      defaultOpen={abiertoInicial}
      className="bg-bg-light text-foreground dark:bg-canvas"
    >
      <MenuLateral items={items} roles={roles} rolActivo={rolActivo} onCambiarRol={cambiarRol} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior migas={migas} />
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
