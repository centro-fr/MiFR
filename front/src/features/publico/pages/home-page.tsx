import { Contacto } from "@/features/publico/components/contacto";
import { Actividades } from "@/features/publico/components/actividades";
import { EncabezadoPublico } from "@/features/publico/components/encabezado-publico";
import { FranjaActividades } from "@/features/publico/components/franja-actividades";
import { NOMBRE_DEL_CENTRO } from "@/features/publico/components/marca-centro";
import { Portada } from "@/features/publico/components/portada";

// Página pública (sin sesión): el punto de entrada del sitio y desde donde se llega al login.
export function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <EncabezadoPublico />
      <main className="flex-1">
        <Portada />
        <FranjaActividades />
        <Actividades />
        <Contacto />
      </main>
      <footer className="border-t border-border">
        <div className="flex px-4 py-6 text-sm text-muted-foreground justify-center">
          <p>
            © {new Date().getFullYear()} {NOMBRE_DEL_CENTRO}
          </p>
        </div>
      </footer>
    </div>
  );
}
