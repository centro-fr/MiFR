import { Actividades } from "@/features/publico/components/actividades";
import { Contacto } from "@/features/publico/components/contacto";
import { DatosEstructurados } from "@/features/publico/components/datos-estructurados";
import { EncabezadoPublico } from "@/features/publico/components/encabezado-publico";
import { PiePublico } from "@/features/publico/components/pie-publico";
import { Portada } from "@/features/publico/components/portada";
import { Ubicacion } from "@/features/publico/components/ubicacion";
import { TITULO_DE_LA_HOME, urlDelSitio } from "@/features/publico/utils/sitio";
import { useColorDeLaBarra } from "@/features/publico/hooks/use-color-de-la-barra";
import { useTituloDelDocumento } from "@/hooks/use-titulo-del-documento";

// Archivo (los titulares, en su ancho expandido) solo la usa esta página: se pide acá y no en
// index.html, así el resto del sistema no la descarga. React la sube al <head> y no la duplica.
// El de --color-publico-tinta: la barra del navegador en el celular sigue al fondo de la página.
const COLOR_DE_LA_PAGINA = "#0f172a";

const FUENTE_DE_TITULARES = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,800&display=swap";

// Página pública (sin sesión): el punto de entrada del sitio y desde donde se llega al login.
// Tiene colores propios, fijos, que no siguen el tema claro/oscuro del sistema.
// La descripción y las etiquetas para compartir (Open Graph) están en index.html: los que arman la
// vista previa de un enlace (WhatsApp, Instagram) no ejecutan JavaScript.
export function HomePage() {
  const sitio = urlDelSitio();
  useTituloDelDocumento(TITULO_DE_LA_HOME);
  useColorDeLaBarra(COLOR_DE_LA_PAGINA);

  return (
    <div className="pagina-publica relative flex min-h-dvh flex-col overflow-x-clip bg-publico-tinta text-white">
      <link rel="stylesheet" href={FUENTE_DE_TITULARES} precedence="default" />
      {sitio && (
        <>
          <link rel="canonical" href={`${sitio}/`} />
          <DatosEstructurados urlDelSitio={sitio} />
        </>
      )}
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
