import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { SessionSplash } from "@/components/guards/session-splash";
import { homePathForRoles } from "@/types/auth";
import type { RoleCode } from "@/types/auth";

interface PermissionGuardProps {
  roles?: RoleCode[];
  permission?: string;
  children: React.ReactNode;
}

// Protege rutas por rol y/o permiso puntual (US-02). Sin permiso muestra 403
// con botón de regreso, como pide la spec (CA-05).
export function PermissionGuard({ roles, permission, children }: PermissionGuardProps) {
  const { user, isLoading } = useAuth();
  const { hasAnyRole, hasPermission } = usePermissions();
  const location = useLocation();

  if (isLoading) return <SessionSplash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const rolOk = !roles || roles.length === 0 || hasAnyRole(roles);
  const permisoOk = !permission || hasPermission(permission);

  if (!rolOk || !permisoOk) {
    return (
      <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-background px-6 py-10 text-center text-foreground">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Sin acceso</h1>
        <p className="max-w-[320px] text-sm leading-relaxed text-muted-foreground">
          No tenés permisos para ver esta sección. Desde tu inicio vas a encontrar las que te corresponden.
        </p>
        <Link
          to={homePathForRoles(user.roles)}
          className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Volver al inicio
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}
