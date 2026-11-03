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
  // Menú del alumno y del tutor (MENUS.md). Perfil lo comparten con la profesora.
  // US-31: racha e insignias del alumno o menor a cargo.
  // US-30: ranking de asistencia para los cuatro roles autorizados.
  // US-16: la pantalla ya está hecha (features/transferencias/pages/mi-plan-page.tsx), pero el back
  // todavía no tiene GET /alumnos/mi-plan y responde 403. Cuando lo tenga, vuelve a su ruta propia.
  { path: "mi-plan", seccion: "Mi plan" },
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
  {
    path: "/disponibilidad",
    errorElement: <RouteErrorBoundary />,
    ...carga,
    lazy: paginaPerezosa(
      () => import("@/features/publico/pages/disponibilidad-page"),
      "DisponibilidadPage",
    ),
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
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/portal-alumno/pages/panel-alumno-page"), "PanelAlumnoPage") },
        ],
      },
      {
        path: "mi-plan",
        element: guardiaDeSeccion("mi-plan"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/transferencias/pages/mi-plan-page"), "MiPlanPage") },
        ],
      },
      {
        // Reportes: una pestaña por informe (US-33 a US-37 y cobranza). El back los reserva a la
        // propietaria con este permiso. Las pestañas sin informe todavía muestran "en construcción".
        path: "reportes",
        element: guardiaDeSeccion("reportes", "REPORTES_COBRANZA_VER"),
        children: [
          { index: true, element: <Navigate to="/app/reportes/inscripciones" replace /> },
          // US-35: inscriptos por mes.
          { path: "inscripciones", lazy: paginaPerezosa(() => import("@/features/reportes/pages/inscripciones-page"), "InscripcionesPage") },
          // US-33: informe de asistencia.
          { path: "asistencia", lazy: paginaPerezosa(() => import("@/features/reportes/pages/informe-asistencia-page"), "InformeAsistenciaPage") },
          ...["planes", "ocupacion", "ranking", "cobranza", "cuotas-vencidas"].map((path) => ({
            path,
            lazy: paginaPerezosa(() => import("@/features/reportes/pages/reporte-en-construccion-page"), "ReporteEnConstruccionPage"),
          })),
        ],
      },
      {
        // US-28: el alumno consulta su rutina y su progreso; el tutor, los de sus menores.
        path: "progreso",
        element: guardiaDeSeccion("progreso", "RUTINAS_VER_PROPIAS"),
        children: [{ index: true, lazy: paginaPerezosa(() => import("@/features/rutinas/pages/mi-progreso-page"), "MiProgresoPage") }],
      },
      {
        // US-30: ranking de asistencia visible para todos los roles autorizados.
        path: "comunidad",
        element: guardiaDeSeccion("comunidad", "REPORTES_RANKING_VER"),
        children: [
          {
            index: true,
            lazy: paginaPerezosa(
              () => import("@/features/portal-alumno/pages/ranking-asistencia-page"),
              "RankingAsistenciaPage",
            ),
          },
        ],
      },
      {
        path: "profesoras",
        element: guardiaDeSeccion("profesoras", "HORARIOS_VER"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/profesoras/pages/profesoras-page"), "ProfesorasPage") },
          { path: ":id", lazy: paginaPerezosa(() => import("@/features/profesoras/pages/profesora-detalle-page"), "ProfesoraDetallePage") },
        ],
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
        // US-22: detección de alumnos ausentes con cuota al día y seguimiento de reintegro.
        path: "ausentes",
        element: guardiaDeSeccion("ausentes", "REPORTES_COBRANZA_VER"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/inactivos/pages/ausentes-page"), "AusentesPage") },
        ],
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
        // US-23: informe mensual de honorarios. Solo la propietaria: el back exige el mismo permiso.
        path: "honorarios",
        element: guardiaDeSeccion("honorarios", "HONORARIOS_VER_TODOS"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/honorarios/pages/honorarios-page"), "HonorariosPage") },
          // US-24 (otro integrante del front): reemplazar por su pantalla de suplencias.
          {
            path: "suplencias",
            lazy: paginaPerezosa(
              () => import("@/features/honorarios/pages/suplencias-page"),
              "SuplenciasPage",
            ),
          },
        ],
      },
      {
        // US-25 y US-26: la bandeja de la campana es de todos los roles; configurar los avisos (días de
        // aviso de la cuota y hora del resumen diario) es solo de la propietaria, como en el back.
        path: "notificaciones",
        element: guardiaDeSeccion("notificaciones"),
        children: [
          {
            index: true,
            lazy: paginaPerezosa(() => import("@/features/notificaciones/pages/bandeja-notificaciones-page"), "BandejaNotificacionesPage"),
          },
          {
            path: "configuracion",
            element: (
              <PermissionGuard roles={["PROPIETARIA"]} permission="PARAMETROS_EDITAR">
                <Outlet />
              </PermissionGuard>
            ),
            children: [
              {
                index: true,
                lazy: paginaPerezosa(() => import("@/features/notificaciones/pages/configuracion-avisos-page"), "ConfiguracionAvisosPage"),
              },
            ],
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
      {
        // US-04: cronograma semanal de clases asignadas ("Mis clases"). Actor: Profesora con HORARIOS_VER.
        path: "mis-clases",
        element: guardiaDeSeccion("mis-clases", "HORARIOS_VER"),
        children: [
          { index: true, lazy: paginaPerezosa(() => import("@/features/horarios/pages/mis-clases-page"), "MisClasesPage") },
        ],
      },
      ...SECCIONES_EN_CONSTRUCCION.map(({ path, seccion }) => ({
        path,
        element: guardiaDeSeccion(path),
        children: [{ index: true, lazy: paginaEnConstruccion(seccion) }],
      })),
      {
        path: "progreso",
        element: guardiaDeSeccion("progreso", "INSIGNIAS_VER_PROPIAS"),
        children: [
          {
            index: true,
            lazy: paginaPerezosa(
              () => import("@/features/portal-alumno/pages/insignias-page"),
              "InsigniasPage",
            ),
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
