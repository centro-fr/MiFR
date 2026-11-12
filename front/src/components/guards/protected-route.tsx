import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { SessionSplash } from "@/components/guards/session-splash";
import { useTituloDelDocumento } from "@/hooks/use-titulo-del-documento";
import { homePathForRoles } from "@/types/auth";

const TITULO_DEL_SISTEMA = "MiFR";

// El login y el sistema no son para buscadores: se piden fuera del índice (robots.txt además
// bloquea /app). React sube el <meta> al <head> y lo saca al salir de estas rutas.
function PaginaDelSistema({ children }: { children: React.ReactNode }) {
  useTituloDelDocumento(TITULO_DEL_SISTEMA);
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      {children}
    </>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <SessionSplash />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <PaginaDelSistema>{children}</PaginaDelSistema>;
}

export function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <SessionSplash />;
  }

  if (user) {
    return <Navigate to={homePathForRoles(user.roles)} replace />;
  }

  return <PaginaDelSistema>{children}</PaginaDelSistema>;
}
