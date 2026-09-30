import { createBrowserRouter, Navigate } from "react-router-dom";
import { GuestOnlyRoute, ProtectedRoute } from "@/components/guards/protected-route";
import { LoginPage } from "@/features/auth/pages/login-page";
import { NotFoundPage, OwnerDashboardPage, StudentHomePage, TeacherHomePage } from "@/pages/placeholders";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
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
  { path: "*", element: <NotFoundPage /> },
]);
