import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { homePathForRoles } from "@/types/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas" aria-busy="true" aria-live="polite">
        <p className="text-sm text-slate-300">Cargando sesión...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas" aria-busy="true" aria-live="polite">
        <p className="text-sm text-slate-300">Cargando sesión...</p>
      </main>
    );
  }

  if (user) {
    return <Navigate to={homePathForRoles(user.roles)} replace />;
  }

  return <>{children}</>;
}
