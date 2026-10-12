import { LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { homePathForRoles } from "@/types/auth";
import { LogoFr } from "@/components/marca/logo-fr";
import { NOMBRE_DEL_CENTRO } from "./marca-centro";

// Con sesión iniciada, el mismo botón lleva al panel en lugar de volver a pedir el login.
function AccesoAlSistema() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div aria-hidden="true" className="h-11 w-36" />;

  return (
    <Button asChild className="h-11 rounded-xl px-4 font-bold shadow-brand-glow hover:bg-primary-dark">
      {user ? (
        <Link to={homePathForRoles(user.roles)}>Ir a mi panel</Link>
      ) : (
        <Link to="/login">
          <LogIn aria-hidden="true" />
          Iniciar sesión
        </Link>
      )}
    </Button>
  );
}

export function EncabezadoPublico() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <a
          href="#inicio"
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
        >
          <LogoFr />
          <span className="hidden truncate text-base font-extrabold text-foreground sm:block">
            {NOMBRE_DEL_CENTRO}
          </span>
        </a>
        <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle compacto />
          <AccesoAlSistema />
        </nav>
      </div>
    </header>
  );
}
