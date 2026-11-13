import { Fragment, useId, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CampanaNotificaciones } from "@/features/notificaciones/components/campana-notificaciones";
import { SelectorDelPortal } from "@/features/portal-alumno/components/selector-del-portal";
import { LogoFr } from "@/components/marca/logo-fr";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/utils/cn";
import { AppMovilLayout } from "./app-movil-layout";
import { panelExclusivoDeLaRuta, type Panel } from "./owner-navigation";
import { useContadoresMenu } from "./use-contadores-menu";
import { useOwnerNavigation, type ItemConEstado, type Miga } from "./use-owner-navigation";
import { usePanelActivo } from "./use-panel-activo";
import { homePathForRoles, type RoleCode } from "@/types/auth";

/** Cookie con la que el Sidebar de shadcn recuerda si quedó contraído (solo UI). */
const COOKIE_SIDEBAR = "sidebar_state";

/** Ítem de navegación con estilo refinado según diseño oscuro */
const CLASES_ITEM =
  "h-11 pointer-fine:h-9.5 rounded-xl px-3 text-sm font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white [&>svg]:size-4 [&>svg]:text-slate-400 hover:[&>svg]:text-white data-[active=true]:bg-[#281525] data-[active=true]:text-white data-[active=true]:font-bold data-[active=true]:[&>svg]:text-primary group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&>span]:hidden transition-colors";

function leerSidebarAbierto(): boolean {
  try {
    return !document.cookie.split("; ").includes(`${COOKIE_SIDEBAR}=false`);
  } catch {
    return true;
  }
}

function LogoMarca() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center">
      <LogoFr className="size-8" />
    </div>
  );
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
          "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-xs font-black tabular-nums text-white shadow-xs select-none",
          className,
        )}
      >
        {valor > 99 ? "99+" : valor}
      </span>
      <span className="sr-only">, {valor === 1 ? "1 pendiente por verificar" : `${valor} pendientes por verificar`}</span>
    </>
  );
}

interface PropsItem {
  item: ItemConEstado;
  alNavegar: () => void;
}

function ItemSimple({ item, alNavegar }: PropsItem) {
  const Icono = item.icono;
  if (!item.to) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton aria-disabled="true" tooltip={`${item.etiqueta} (próximamente)`} className={CLASES_ITEM}>
          <Icono aria-hidden="true" />
          <span>{item.etiqueta}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
  return (
    <SidebarMenuItem>
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
            <Contador valor={item.contador} className="absolute top-0.5 right-0.5 h-4 min-w-4 px-0.5 text-[10px]" />
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

function GrupoDesplegable({ item, alNavegar }: PropsItem) {
  const { pathname } = useLocation();
  const [forzado, setForzado] = useState<{ ruta: string; abierto: boolean } | null>(null);
  const abierto = forzado?.ruta === pathname ? forzado.abierto : item.esActivo;
  const alternar = () => setForzado({ ruta: pathname, abierto: !abierto });

  return (
    <SidebarMenuItem>
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
  alNavegar: () => void;
}

function SeccionMenu({ seccion, contraido, alNavegar }: PropsSeccion) {
  const idTitulo = useId();
  return (
    <SidebarGroup className="py-1 group-data-[collapsible=icon]:px-0">
      {seccion.titulo && (
        <SidebarGroupLabel
          id={idTitulo}
          className="text-[11px] font-bold tracking-wider uppercase text-slate-400/90 px-3"
        >
          {seccion.titulo}
        </SidebarGroupLabel>
      )}
      <SidebarMenu aria-labelledby={seccion.titulo ? idTitulo : undefined}>
        {seccion.items.map((item) => {
          const clave = item.to ?? item.etiqueta;
          if (!item.hijos) return <ItemSimple key={clave} item={item} alNavegar={alNavegar} />;
          return contraido ? (
            <GrupoContraido key={clave} item={item} />
          ) : (
            <GrupoDesplegable key={clave} item={item} alNavegar={alNavegar} />
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
          {indice > 0 && <SidebarSeparator className="my-1.5 pointer-events-none border-slate-800" />}
          <SeccionMenu seccion={seccion} contraido={contraido} alNavegar={alNavegar} />
        </Fragment>
      ))}
    </nav>
  );
}

/** Switch de roles Propietaria / Profesora en el header del menú */
function SwitchRoles({
  roles,
  rolActivo,
  onCambiarRol,
}: {
  roles: readonly RoleCode[];
  rolActivo?: RoleCode;
  onCambiarRol: (panel: Panel) => void;
}) {
  if (!roles.includes("PROPIETARIA") || !roles.includes("PROFESORA")) {
    return null;
  }

  return (
    <div className="hidden md:block px-3 pt-3 pb-1 group-data-[collapsible=icon]:hidden">
      <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 gap-1">
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
          Profesor/a
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
    <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
      <div className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="size-8 shrink-0 border border-white/10 shadow-xs cursor-default">
              {user?.fotoUrl && (
                <AvatarImage
                  src={user.fotoUrl}
                  alt={nombre}
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-primary text-xs font-bold text-white">
                {iniciales}
              </AvatarFallback>
            </Avatar>
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
  rolActivo?: RoleCode;
  onCambiarRol: (panel: Panel) => void;
}) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-14 flex flex-row items-center border-b border-sidebar-border px-3.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        <div className="flex w-full items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
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
              {esUltima ? (
                <span
                  aria-current="page"
                  className="truncate font-semibold text-slate-700 dark:text-slate-200"
                >
                  {miga.etiqueta}
                </span>
              ) : miga.to ? (
                <Link
                  to={miga.to}
                  className="truncate text-slate-400 transition-colors hover:text-primary dark:text-slate-500 dark:hover:text-pink-300"
                >
                  {miga.etiqueta}
                </Link>
              ) : (
                <span className="truncate text-slate-400 dark:text-slate-500">
                  {miga.etiqueta}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface PropsBarraSuperior {
  migas: Miga[];
  roles: readonly RoleCode[];
  rolActivo?: RoleCode;
  onCambiarRol: (panel: Panel) => void;
}

/** Barra superior: trigger del menú lateral, migas de pan, notificaciones y alternar tema */
/** `centro`: el selector de menor del tutor, al medio de la barra. */
function BarraSuperior({
  migas,
  roles,
  rolActivo,
  onCambiarRol,
  centro,
}: PropsBarraSuperior & { centro?: ReactNode }) {
  const tieneLosDos = roles.includes("PROPIETARIA") && roles.includes("PROFESORA");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border md:border-border max-md:border-sidebar-border bg-bg-light max-md:bg-sidebar max-md:text-white pl-1.5 pr-3 sm:pl-2 sm:pr-4 dark:bg-canvas">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-0.5 size-8 min-h-8 rounded-lg text-slate-600 hover:text-slate-900 max-md:text-white max-md:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white [&_svg]:size-5" />
        <Separator orientation="vertical" className="h-4 hidden md:block" />
        <div className="flex items-center gap-2 md:hidden">
          <LogoMarca />
          {tieneLosDos ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Cambiar vista de rol"
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/20 bg-white/5"
                >
                  <span>{rolActivo === "PROPIETARIA" ? "Propietaria" : "Profesora"}</span>
                  <ChevronDown className="size-3.5 text-slate-300" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-36 rounded-xl p-1 bg-slate-900 border-slate-800 text-white shadow-xl">
                <DropdownMenuItem
                  onClick={() => onCambiarRol("PROPIETARIA")}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 hover:text-white",
                    rolActivo === "PROPIETARIA" && "bg-primary/20 text-white font-bold",
                  )}
                >
                  Propietaria
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onCambiarRol("PROFESORA")}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10 hover:text-white",
                    rolActivo === "PROFESORA" && "bg-primary/20 text-white font-bold",
                  )}
                >
                  Profesora
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-sm font-extrabold text-white">MiFR Centro</span>
          )}
        </div>
        <MigasDePan migas={migas} />
      </div>
      {centro}
      <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
        <div className="max-md:hidden">
          <CampanaNotificaciones />
        </div>
        <div className="md:hidden">
          <CampanaNotificaciones sobreFondoOscuro />
        </div>
        <ThemeToggle compacto className="max-md:text-slate-300 max-md:hover:bg-white/10 max-md:hover:text-white" />
      </div>
    </header>
  );
}

interface OwnerLayoutProps {
  children: ReactNode;
  /** Submiga o etiqueta final para añadir al final del breadcrumb (ej: nombre de alumno en ficha de detalle) */
  submiga?: string;
  /** Reemplazo total de migas si la pantalla necesita una estructura específica */
  migasPersonalizadas?: Miga[];
  /** Celular de profesora y alumno: título de la barra superior (por defecto, el ítem activo del menú). */
  tituloMovil?: string;
  /** Celular de profesora y alumno: a dónde lleva la flecha de volver en una pantalla de detalle. */
  volverA?: string;
}

// La profesora y el alumno usan la app sobre todo desde el celular: ahí tienen barra inferior. La
// propietaria que también dicta la tiene en su panel de Profesora y vuelve al suyo desde Perfil.
function usaAppMovil(panel: RoleCode | undefined, esMobile: boolean): boolean {
  return esMobile && panel !== undefined && panel !== "PROPIETARIA";
}

// Layout de la app autenticada con soporte para switch de roles
export function OwnerLayout({ children, submiga, migasPersonalizadas, tituloMovil, volverA }: OwnerLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { roles } = usePermissions();
  const { panelActivo, elegirPanel } = usePanelActivo();
  const esMobile = useIsMobile();

  // En una pantalla que ofrecen los dos paneles (Alumnos) se queda: cambia lo que muestra.
  const cambiarPanel = (panel: Panel) => {
    elegirPanel(panel);
    const panelDeLaRuta = panelExclusivoDeLaRuta(pathname);
    if (panelDeLaRuta && panelDeLaRuta !== panel) navigate(homePathForRoles([panel]));
  };

  const contadores = useContadoresMenu();
  const { items, migas: migasNavegacion } = useOwnerNavigation(contadores, roles, panelActivo);
  const migasBase = submiga
    ? migasNavegacion.filter((m) => m.etiqueta !== "Alumnos")
    : migasNavegacion;
  const migas = migasPersonalizadas ?? (submiga ? [...migasBase, { etiqueta: submiga }] : migasNavegacion);
  const [abiertoInicial] = useState(leerSidebarAbierto);

  // El tutor elige de quién ver los datos desde la barra; solo el portal del alumno lo usa.
  const esPortalDelAlumno = panelActivo === "ALUMNO" || panelActivo === "TUTOR";

  if (usaAppMovil(panelActivo, esMobile)) {
    const titulo = tituloMovil ?? items.find((item) => item.esActivo)?.etiqueta ?? "MiFR";
    return (
      <AppMovilLayout items={items} titulo={titulo} volverA={volverA} centro={esPortalDelAlumno && <SelectorDelPortal sobreFondoOscuro />}>
        {children}
      </AppMovilLayout>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={abiertoInicial}
      className="bg-bg-light text-foreground dark:bg-canvas"
    >
      <MenuLateral items={items} roles={roles} rolActivo={panelActivo} onCambiarRol={cambiarPanel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior
          migas={migas}
          roles={roles}
          rolActivo={panelActivo}
          onCambiarRol={cambiarPanel}
          centro={esPortalDelAlumno && <SelectorDelPortal />}
        />
        <main className="flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
