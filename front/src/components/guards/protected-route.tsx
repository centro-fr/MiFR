import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { SessionSplash } from "@/components/guards/session-splash";
import { homePathForRoles } from "@/types/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <SessionSplash />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <SessionSplash />;
  }

  if (user) {
    return <Navigate to={homePathForRoles(user.roles)} replace />;
  }

  return <>{children}</>;
}
