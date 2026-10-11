import type { ComponentType } from "react";
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from "react-router-dom";
import { GuestOnlyRoute, ProtectedRoute } from "@/components/guards/protected-route";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { RouteErrorBoundary } from "@/components/guards/route-error-boundary";
import { SessionSplash } from "@/components/guards/session-splash";
import { EnConstruccionPage } from "@/pages/en-construccion-page";
import { NotFoundPage, StudentHomePage, TeacherHomePage } from "@/pages/placeholders";

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

// Secciones sin funcionalidad real: pantalla genérica "En construcción" dentro del layout
// normal (con sidebar). Al implementar cada sección, reemplazar su ruta por la página real.
const SECCIONES_EN_CONSTRUCCION = [
  { path: "planes", seccion: "Planes y Precios" },
  { path: "pagos", seccion: "Cobros y Cuotas" },
  { path: "asistencia", seccion: "Asistencia" },
  { path: "honorarios", seccion: "Honorarios" },
  { path: "notificaciones", seccion: "Notificaciones" },
  { path: "reportes", seccion: "Reportes" },
];

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace />, errorElement: <RouteErrorBoundary /> },
  { path: "/seguridad/permisos", element: <Navigate to="/app/seguridad/permisos" replace /> },
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
    // Layout sin ruta propia: exige sesión a todo lo que cuelga de /app.
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
      { path: "dashboard", lazy: paginaPerezosa(() => import("@/pages/owner-dashboard-page"), "OwnerDashboardPage") },
      { path: "hoy", element: <TeacherHomePage /> },
      { path: "inicio", element: <StudentHomePage /> },
      {
        path: "actividades",
        lazy: paginaPerezosa(() => import("@/features/actividades/pages/actividades-page"), "ActividadesPage"),
      },
      { path: "horarios", lazy: paginaPerezosa(() => import("@/features/horarios/pages/HorariosPage"), "HorariosPage") },
      {
        path: "alumnos",
        lazy: paginaPerezosa(() => import("@/features/alumnos/pages/AlumnosPage"), "AlumnosPage"),
      },
      {
        path: "seguridad/permisos",
        element: (
          <PermissionGuard roles={["PROPIETARIA"]} permission="SEGURIDAD_MATRIZ_VER">
            <Outlet />
          </PermissionGuard>
        ),
        children: [
          {
            index: true,
            lazy: paginaPerezosa(() => import("@/features/seguridad/pages/permisos-page"), "PermisosPage"),
          },
        ],
      },
      ...SECCIONES_EN_CONSTRUCCION.map(({ path, seccion }) => ({
        path,
        element: <EnConstruccionPage seccion={seccion} />,
      })),
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
