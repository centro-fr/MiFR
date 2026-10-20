import type { ComponentType } from "react";
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from "react-router-dom";
import { GuestOnlyRoute, ProtectedRoute } from "@/components/guards/protected-route";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { RouteErrorBoundary } from "@/components/guards/route-error-boundary";
import { SessionSplash } from "@/components/guards/session-splash";
import { rolesConAcceso } from "@/components/layout/owner-navigation";
import { NotFoundPage } from "@/pages/placeholders";

/**
 * Importa la página recién al navegar a su ruta: cada una queda en su propio chunk
 * y el bundle inicial no carga pantallas que la persona todavía no visitó.
 */
function paginaPerezosa<Modulo extends Record<string, unknown>>(
  importar: () => Promise<Modulo>,
  nombre: keyof Modulo,
): NonNullable<RouteObject["lazy"]> {
  return async () => ({ Component: (await importar())[nombre] as ComponentType });
}

// Mientras baja el chunk de la primera ruta se muestra el splash de sesión, no una pantalla en blanco.
const carga = { hydrateFallbackElement: <SessionSplash /> };

/**
 * Guardia de una sección de /app: entra solo un rol cuyo menú la ofrece (owner-navigation.ts) y,
 * si se pide, con el permiso puntual de la matriz. Las subrutas (ficha, alta, edición) la heredan.
 */
function guardiaDeSeccion(path: string, permission?: string) {
  const roles = rolesConAcceso(`/app/${path}`);
  // Con roles vacíos PermissionGuard dejaría pasar a cualquiera: una sección sin menú es un error.
  if (roles.length === 0) throw new Error(`La sección /app/${path} no está en el menú de ningún rol`);
  return (
    <PermissionGuard roles={roles} permission={permission}>
      <Outlet />
    </PermissionGuard>
  );
}

// Como paginaPerezosa, pero la página recibe el nombre de la sección.
function paginaEnConstruccion(seccion: string): NonNullable<RouteObject["lazy"]> {
  return async () => {
    const { EnConstruccionPage } = await import("@/pages/en-construccion-page");
    return { element: <EnConstruccionPage seccion={seccion} /> };
  };
}

/**
 * Pantalla de un grupo del menú (sus sub-opciones como tarjetas). Quien no tiene ese grupo en su
 * menú va a `alternativa`: la profesora no tiene el grupo Alumnos y entra directo al listado.
 */
function paginaDeGrupo(ruta: string, alternativa: string): NonNullable<RouteObject["lazy"]> {
  return async () => {
    const { GrupoMenuPage } = await import("@/pages/grupo-menu-page");
    return { element: <GrupoMenuPage ruta={ruta} alternativa={alternativa} /> };
  };
}

// Secciones sin funcionalidad real: pantalla genérica "En construcción" dentro del layout
// normal (con sidebar). Al implementar cada sección, reemplazar su ruta por la página real.
const SECCIONES_EN_CONSTRUCCION = [
  { path: "ausentes", seccion: "Ausentes" },
  { path: "pagos", seccion: "Cobros y Cuotas" },
  { path: "honorarios", seccion: "Honorarios" },
  { path: "notificaciones", seccion: "Notificaciones" },
  { path: "reportes", seccion: "Reportes" },
  // Menú de la profesora (MENUS.md).
  { path: "mis-clases", seccion: "Mis clases" },
  { path: "cobros", seccion: "Cobros" },
  // Menú del alumno y del tutor (MENUS.md). Perfil lo comparten con la profesora.
  // US-16: la pantalla ya está hecha (features/transferencias/pages/mi-plan-page.tsx), pero el back
  // todavía no tiene GET /alumnos/mi-plan y responde 403. Cuando lo tenga, vuelve a su ruta propia.
  { path: "mi-plan", seccion: "Mi plan" },
  { path: "progreso", seccion: "Progreso" },
  { path: "comunidad", seccion: "Comunidad" },
  { path: "perfil", seccion: "Perfil" },
];

export const router = createBrowserRouter([
  // Página pública: la ve cualquiera, con sesión o sin ella. Desde ahí se llega al login.
  {
    path: "/",
    errorElement: <RouteErrorBoundary />,
    ...carga,
    lazy: paginaPerezosa(() => import("@/features/publico/pages/home-page"), "HomePage"),
  },
  { path: "/seguridad/permisos", element: <Navigate to="/app/dashboard" replace /> },
  {
    path: "/login",
    element: (
      <GuestOnlyRoute>
        <Outlet />
      </GuestOnlyRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    ...carga,
    children: [{ index: true, lazy: paginaPerezosa(() => import("@/features/auth/pages/login-page"), "LoginPage") }],
  },
  {
    // Layout sin ruta propia: exige sesión a todo lo que cuelga de /app. Cada sección, además,
    // exige un rol cuyo menú la ofrezca: entrar por URL a la de otro rol muestra "Sin acceso".
    path: "/app",
    element: (
      <ProtectedRoute>
        <Outlet />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    ...carga,
    children: [
      { index: true, element: <NotFoundPage /> },
      {
        path: "dashboard",
        element: guardiaDeSeccion("dashboard"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/pages/owner-dashboard-page"), "OwnerDashboardPage") },
        ],
      },
      {
        path: "asistencia",
        element: <Navigate to="/app/ausentes" replace />,
      },
      {
        // Grupo "Profesora" que suma a su menú la propietaria que también dicta clases.
        path: "profesora",
        element: guardiaDeSeccion("profesora"),
        children: [{ index: true, lazy: paginaDeGrupo("/app/profesora", "/app/hoy") }],
      },
      {
        path: "hoy",
        element: guardiaDeSeccion("hoy", "ASISTENCIAS_MARCAR"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/asistencia/pages/asistencia-page"), "ClasesDeHoyPage") },
          { path: ":id", lazy: paginaPerezosa(() => import("@/features/asistencia/pages/asistencia-page"), "ClasesDeHoyPage") },
        ],
      },
      {
        path: "inicio",
        element: guardiaDeSeccion("inicio"),
        children: [{ index: true, lazy: paginaPerezosa(() => import("@/pages/inicio-provisorio-page"), "StudentHomePage") }],
      },
      {
        path: "actividades",
        element: guardiaDeSeccion("actividades", "ACTIVIDADES_VER"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/actividades/pages/actividades-page"), "ActividadesPage") },
        ],
      },
      {
        path: "horarios",
        element: guardiaDeSeccion("horarios", "HORARIOS_VER"),
        children: [{ index: true, lazy: paginaPerezosa(() => import("@/features/horarios/pages/HorariosPage"), "HorariosPage") }],
      },
      {
        // La guardia sale del listado, que lo tienen la propietaria y la profesora: las dos abren la ficha.
        path: "alumnos",
        element: guardiaDeSeccion("alumnos/listado", "ALUMNOS_VER"),
        children: [
          // Pantalla del grupo Alumnos (solo en el menú de la propietaria).
          { index: true, lazy: paginaDeGrupo("/app/alumnos", "/app/alumnos/listado") },
          // US-10: listado de alumnos (búsqueda y filtros) y alta de pre-inscripción (US-05).
          { path: "listado", lazy: paginaPerezosa(() => import("@/features/alumnos/pages/alumnos-page"), "AlumnosPage") },
          // Ficha del alumno: datos y edición (US-09), plan y horarios, baja y reactivación (US-08).
          { path: ":id", lazy: paginaPerezosa(() => import("@/features/alumnos/pages/alumno-detalle-page"), "AlumnoDetallePage") },
        ],
      },
      {
        // Redirección de la ruta histórica de pendientes de alta hacia Cobros y Cuotas
        path: "alumnos/pendientes",
        element: <Navigate to="/app/pagos?tab=transferencias" replace />,
      },
      {
        // US-11: planes vigentes. Verlos pide PLANES_VER; crearlos y editarlos, además, PLANES_EDITAR.
        path: "planes",
        element: guardiaDeSeccion("planes", "PLANES_VER"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/planes/pages/planes-page"), "PlanesPage") },
          {
            element: (
              <PermissionGuard permission="PLANES_EDITAR">
                <Outlet />
              </PermissionGuard>
            ),
            children: [
              { path: "nuevo", lazy: paginaPerezosa(() => import("@/features/planes/pages/plan-form-page"), "NuevoPlanPage") },
              { path: ":idPlan/editar", lazy: paginaPerezosa(() => import("@/features/planes/pages/plan-form-page"), "EditarPlanPage") },
            ],
          },
        ],
      },
      {
        // Cobros y Cuotas (US-15 a US-19): la pantalla del grupo y cada una de sus opciones.
        path: "pagos",
        element: guardiaDeSeccion("pagos"),
        children: [
          {
            index: true,
            lazy: paginaPerezosa(() => import("@/features/cobros/pages/cobros-page"), "CobrosPage"),
          },
          {
            path: "cuotas",
            element: <Navigate to="/app/pagos?tab=cuotas" replace />,
          },
          {
            path: "transferencias",
            element: <Navigate to="/app/pagos?tab=transferencias" replace />,
          },
        ],
      },
      {
        path: "seguridad/permisos",
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        // US-15: cobro en efectivo. Actor: Profesora (menú 'Cobros') con PAGOS_REGISTRAR.
        path: "cobros",
        element: guardiaDeSeccion("cobros", "PAGOS_REGISTRAR"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/cobros/pages/cobros-page"), "CobrosPage") },
        ],
      },
      ...SECCIONES_EN_CONSTRUCCION.map(({ path, seccion }) => ({
        path,
        element: guardiaDeSeccion(path),
        children: [{ index: true, lazy: paginaEnConstruccion(seccion) }],
      })),
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
