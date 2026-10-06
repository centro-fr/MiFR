import { createBrowserRouter, Navigate } from "react-router-dom";
import { GuestOnlyRoute, ProtectedRoute } from "@/components/guards/protected-route";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { RouteErrorBoundary } from "@/components/guards/route-error-boundary";
import { LoginPage } from "@/features/auth/pages/login-page";
import { PermisosPage } from "@/features/seguridad/pages/permisos-page";
import { EnConstruccionPage } from "@/pages/en-construccion-page";
import { NotFoundPage, StudentHomePage, TeacherHomePage } from "@/pages/placeholders";
import { OwnerDashboardPage } from "@/pages/owner-dashboard-page";

// Importación de tu nueva página de Actividades (US-03)
import { ActividadesPage } from "@/pages/ActividadesPage"; 

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace />, errorElement: <RouteErrorBoundary /> },
  { path: "/seguridad/permisos", element: <Navigate to="/app/seguridad/permisos" replace /> },
  {
    path: "/login",
    element: (
      <GuestOnlyRoute>
        <LoginPage />
      </GuestOnlyRoute>
    ),
  },
  {
    path: "/app/dashboard",
    element: (
      <ProtectedRoute>
        <OwnerDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/hoy",
    element: (
      <ProtectedRoute>
        <TeacherHomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/inicio",
    element: (
      <ProtectedRoute>
        <StudentHomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/actividades",
    element: (
      <ProtectedRoute>
        <ActividadesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app/seguridad/permisos",
    element: (
      <ProtectedRoute>
        <PermissionGuard roles={["PROPIETARIA"]} permission="SEGURIDAD_MATRIZ_VER">
          <PermisosPage />
        </PermissionGuard>
      </ProtectedRoute>
    ),
  },
  // Secciones sin funcionalidad real: pantalla genérica "En construcción"
  // dentro del layout normal (con sidebar). Al implementar cada sección,
  // reemplazar su ruta por la página real.
  ...[
    { path: "/app/alumnos", seccion: "Alumnos" },
    { path: "/app/planes", seccion: "Planes y Precios" },
    { path: "/app/pagos", seccion: "Cobros y Cuotas" },
    { path: "/app/asistencia", seccion: "Asistencia" },
    { path: "/app/honorarios", seccion: "Honorarios" },
    { path: "/app/notificaciones", seccion: "Notificaciones" },
    { path: "/app/reportes", seccion: "Reportes" },
  ].map(({ path, seccion }) => ({
    path,
    element: (
      <ProtectedRoute>
        <EnConstruccionPage seccion={seccion} />
      </ProtectedRoute>
    ),
  })),
  { path: "*", element: <NotFoundPage /> },
]);