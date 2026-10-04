import { createBrowserRouter, Navigate } from "react-router-dom";
import { GuestOnlyRoute, ProtectedRoute } from "@/components/guards/protected-route";
import { PermissionGuard } from "@/components/guards/permission-guard";
import { RouteErrorBoundary } from "@/components/guards/route-error-boundary";
import { LoginPage } from "@/features/auth/pages/login-page";
import { PermisosPage } from "@/features/seguridad/pages/permisos-page";
import { NotFoundPage, OwnerDashboardPage, StudentHomePage, TeacherHomePage } from "@/pages/placeholders";

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
    element: 
        
        <ActividadesPage />
    
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
  { path: "*", element: <NotFoundPage /> },
]);