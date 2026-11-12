import { NOMBRE_DEL_CENTRO } from "@/features/publico/components/marca-centro";
import { COORDENADAS_DEL_CENTRO, DIRECCION_DEL_CENTRO } from "@/features/publico/utils/ubicacion";

export const TITULO_DE_LA_HOME = `${NOMBRE_DEL_CENTRO} · Gimnasio en Perico, Jujuy`;

// Dirección pública del sitio (VITE_SITIO_URL), sin barra final. La necesitan las URLs absolutas de
// la canónica y de los datos estructurados; sin configurar, esas etiquetas no se publican.
export function urlDelSitio(valor: string | undefined = import.meta.env.VITE_SITIO_URL): string | null {
  const limpio = (valor ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+$/.test(limpio) ? limpio : null;
}

// Ficha del centro en schema.org (ExerciseGym) para que los buscadores lo muestren como negocio
// local: dirección, ubicación en el mapa, teléfono e Instagram. Sale de los mismos datos que la
// página, así nunca se contradicen.
export function fichaDelCentro(urlDelSitio: string, telefono: string | undefined, instagram: string | null) {
  return {
    "@context": "https://schema.org",
    "@type": "ExerciseGym",
    name: NOMBRE_DEL_CENTRO,
    url: `${urlDelSitio}/`,
    image: `${urlDelSitio}/og-portada.jpg`,
    logo: `${urlDelSitio}/logo-fr.webp`,
    ...(telefono ? { telephone: telefono.trim() } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: `${DIRECCION_DEL_CENTRO.calle} ${DIRECCION_DEL_CENTRO.altura}`,
      postalCode: DIRECCION_DEL_CENTRO.codigoPostal,
      addressLocality: "Perico",
      addressRegion: "Jujuy",
      addressCountry: "AR",
    },
    geo: { "@type": "GeoCoordinates", latitude: COORDENADAS_DEL_CENTRO[0], longitude: COORDENADAS_DEL_CENTRO[1] },
    ...(instagram ? { sameAs: [instagram] } : {}),
  };
}
