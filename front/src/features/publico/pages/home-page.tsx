import { Actividades } from "@/features/publico/components/actividades";
import { Contacto } from "@/features/publico/components/contacto";
import { EncabezadoPublico } from "@/features/publico/components/encabezado-publico";
import { PiePublico } from "@/features/publico/components/pie-publico";
import { Portada } from "@/features/publico/components/portada";
import { Ubicacion } from "@/features/publico/components/ubicacion";

// Archivo (los titulares, en su ancho expandido) solo la usa esta página: se pide acá y no en
// index.html, así el resto del sistema no la descarga. React la sube al <head> y no la duplica.
const FUENTE_DE_TITULARES = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,800&display=swap";

// Página pública (sin sesión): el punto de entrada del sitio y desde donde se llega al login.
// Tiene colores propios, fijos, que no siguen el tema claro/oscuro del sistema.
export function HomePage() {
  return (
    <div className="pagina-publica relative flex min-h-dvh flex-col overflow-x-clip bg-publico-tinta text-white">
      <link rel="stylesheet" href={FUENTE_DE_TITULARES} precedence="default" />
      <EncabezadoPublico />
      <main className="flex-1">
        <Portada />
        <Actividades />
        <Ubicacion />
        <Contacto />
      </main>
      <PiePublico />
    </div>
  );
}
