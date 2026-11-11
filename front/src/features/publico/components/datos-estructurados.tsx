import { enlacesDeContacto } from "@/features/publico/utils/contacto";
import { fichaDelCentro } from "@/features/publico/utils/sitio";

// "<" escapado: ningún texto de los datos puede cerrar el <script> antes de tiempo.
function aJsonParaScript(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}

export function DatosEstructurados({ urlDelSitio }: { urlDelSitio: string }) {
  const { instagram } = enlacesDeContacto();
  const ficha = fichaDelCentro(urlDelSitio, import.meta.env.VITE_WHATSAPP_NUMERO, instagram);

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: aJsonParaScript(ficha) }} />;
}
