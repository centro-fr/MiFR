import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { enlacesDeContacto } from "@/features/publico/utils/contacto";
import { BOTON_CONTORNO, BOTON_DESTACADO, CONTENEDOR_PUBLICO } from "./estilos-publicos";

// La foto se publica dejando el archivo en front/public/centro.webp. Mientras no exista, la capa de la
// foto no pinta nada y quedan los degradés de la marca sobre el fondo oscuro. La actual es provisoria
// (Unsplash, Sven Mieke, licencia de Unsplash): va a reemplazarse por una foto del centro.
// Los velos oscuros van encima de la foto para que el título se lea sobre cualquier imagen.
const FONDO_DE_PORTADA: CSSProperties = {
  background: [
    "radial-gradient(900px 600px at 85% 20%, rgba(233,30,130,0.22), transparent 60%)",
    "radial-gradient(700px 500px at 10% 100%, rgba(120,20,80,0.35), transparent 60%)",
    "linear-gradient(90deg, rgba(11,13,18,0.92) 0%, rgba(11,13,18,0.6) 45%, rgba(11,13,18,0.15) 100%)",
    "linear-gradient(180deg, rgba(11,13,18,0.2) 0%, rgba(11,13,18,0) 40%, #0b0d12 100%)",
    "url('/centro.webp') center 62% / cover no-repeat",
    "#0b0d12",
  ].join(", "),
};

export function Portada() {
  const { whatsapp, instagram } = enlacesDeContacto();
  const hayContacto = Boolean(whatsapp || instagram);

  return (
    <section
      id="inicio"
      aria-labelledby="titulo-portada"
      style={FONDO_DE_PORTADA}
      className="relative flex min-h-[min(100svh,844px)] items-center md:min-h-[min(100svh,900px)]"
    >
      <div className={`${CONTENEDOR_PUBLICO} pb-12 pt-24 md:pb-[72px] md:pt-[110px]`}>
        <div className="motion-safe:animate-hero-enter">
          <h1
            id="titulo-portada"
            className="m-0 font-display text-[76px] font-normal uppercase leading-[72px] md:text-[112px] md:leading-[104px] lg:text-[148px] lg:leading-[136px]"
          >
            Entrená
            <br />
            con <span className="text-primary">energía.</span>
          </h1>
          <p className="mt-7 max-w-[520px] text-base leading-6 text-publico-texto-claro md:text-[19px] md:leading-[30px]">
            Fuerza, HIIT, funcional y mucho más, con profes que te siguen de cerca. Elegí cómo querés entrenar y
            sumate.
          </p>
          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {hayContacto && (
              <a
                href="#contacto"
                className={`${BOTON_DESTACADO} bg-primary text-white shadow-[0_10px_24px_rgba(233,30,130,0.35)] hover:shadow-[0_14px_30px_rgba(233,30,130,0.45)]`}
              >
                Quiero empezar
                <ArrowRight aria-hidden="true" className="size-[18px]" strokeWidth={2.5} />
              </a>
            )}
            <a href="#actividades" className={`${BOTON_CONTORNO} border-white/30 hover:bg-white/10`}>
              Ver actividades
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
