import { Link } from "react-router-dom";
import { EncabezadoPublico } from "@/features/publico/components/encabezado-publico";
import { NOMBRE_DEL_CENTRO } from "@/features/publico/components/marca-centro";
import { Portada } from "@/features/publico/components/portada";
import { Proximamente } from "@/features/publico/components/proximamente";
import { TableroHorarios } from "@/features/publico/components/tablero-horarios";

// Página pública (sin sesión): el punto de entrada del sitio y desde donde se llega al login.
export function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <EncabezadoPublico />
      <main className="flex-1">
        <Portada />
        <TableroHorarios />
        <Proximamente />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {NOMBRE_DEL_CENTRO}
          </p>
          <Link to="/login" className="min-h-[44px] content-center font-semibold text-primary hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}
