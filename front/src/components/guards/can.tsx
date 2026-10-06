import type { ReactNode } from "react";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";

interface CanProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

// Oculta contenido sin el permiso efectivo. No renderiza nada por defecto.
export function Can({ permission, children, fallback = null }: CanProps) {
  const { hasPermission } = usePermissions();
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
