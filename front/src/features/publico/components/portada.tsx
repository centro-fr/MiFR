import { useRef, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { animarPortada } from "@/features/publico/animaciones/animaciones-publicas";
import { useAnimacion } from "@/features/publico/animaciones/use-animacion";
import { enlacesDeContacto } from "@/features/publico/utils/contacto";
import { BOTON_DESTACADO, CONTENEDOR_PUBLICO, FLECHA_DEL_BOTON, TITULAR } from "./estilos-publicos";
import { LineaDeTitulo } from "./linea-de-titulo";

// Foto provisoria (stock en blanco y negro) hasta tener una del centro: se reemplaza el archivo en
// front/public/portada-publica.jpg. El único color de la portada es el magenta de la marca.
const FOTO = { src: "/portada-publica.jpg", ancho: 2200, alto: 1468 };

// Velos oscuros sobre la foto para que el título se lea sobre cualquier imagen. En mobile el texto
// queda abajo y la foto arriba; en desktop el texto a la izquierda.
const VELO_MOBILE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.15) 30%, rgba(15,23,42,0.85) 62%, var(--color-publico-tinta) 100%)",
};
const VELO_DESKTOP: CSSProperties = {
  background: [
    "linear-gradient(90deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.82) 38%, rgba(15,23,42,0.25) 72%, rgba(15,23,42,0.1) 100%)",
    "linear-gradient(180deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0) 22%, rgba(15,23,42,0) 70%, var(--color-publico-tinta) 100%)",
  ].join(", "),
};

export function Portada() {
  const raiz = useRef<HTMLElement>(null);
  const { whatsapp, instagram } = enlacesDeContacto();
  const hayContacto = Boolean(whatsapp || instagram);
  useAnimacion(raiz, animarPortada);

  return (
    <section ref={raiz} id="inicio" aria-labelledby="titulo-portada" className="relative overflow-hidden">
      <img
        data-foto=""
        src={FOTO.src}
        width={FOTO.ancho}
        height={FOTO.alto}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        style={{ filter: "contrast(1.1) brightness(0.85)" }}
        className="absolute inset-0 size-full object-cover object-[72%_30%] md:object-[70%_40%]"
      />
      <div aria-hidden="true" style={VELO_MOBILE} className="absolute inset-0 md:hidden" />
      <div aria-hidden="true" style={VELO_DESKTOP} className="absolute inset-0 hidden md:block" />

      <div
        data-contenido=""
        className={`${CONTENEDOR_PUBLICO} relative flex min-h-[640px] flex-col justify-end pb-12 pt-[120px] md:min-h-[min(100svh,860px)] md:pb-[88px]`}
      >
        <h1 id="titulo-portada" className="m-0">
          <LineaDeTitulo>
            <span className={`${TITULAR} block text-[34px] leading-[38px] md:text-[72px] md:leading-[76px]`}>
              Entrená con
            </span>
          </LineaDeTitulo>
          <LineaDeTitulo>
            <span className={`${TITULAR} block text-[15vw] leading-none text-primary md:text-[112px] md:leading-[112px]`}>
              energía
            </span>
          </LineaDeTitulo>
        </h1>
        <div data-bajada="" className="mt-5 flex flex-col items-stretch gap-4 md:mt-8 md:flex-row md:items-center md:gap-7">
          {hayContacto && (
            <a href="#contacto" className={`${BOTON_DESTACADO} h-[54px] shrink-0`}>
              Quiero empezar
              <ArrowRight aria-hidden="true" strokeWidth={2.5} className={FLECHA_DEL_BOTON} />
            </a>
          )}
          <p className="m-0 text-[15px] leading-[23px] text-publico-texto-suave md:max-w-[300px]">
            Fuerza, HIIT, funcional y más, con profes que te siguen de cerca.
          </p>
        </div>
      </div>
    </section>
  );
}
