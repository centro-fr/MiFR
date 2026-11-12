import { lazy, Suspense, useRef } from "react";
import { MapPin } from "lucide-react";
import { animarSeccion } from "@/features/publico/animaciones/animaciones-publicas";
import { useAnimacion } from "@/features/publico/animaciones/use-animacion";
import {
  COORDENADAS_DEL_CENTRO,
  DIAS_DE_CLASE,
  DIRECCION_COMPLETA,
  DIRECCION_DEL_CENTRO,
  ENLACE_COMO_LLEGAR,
} from "@/features/publico/utils/ubicacion";
import { BOTON_CONTORNO, CONTENEDOR_PUBLICO, ESPACIO_DE_SECCION, TEXTO_HUECO, TITULAR, TITULO_DE_SECCION } from "./estilos-publicos";
import { LineaDeTitulo } from "./linea-de-titulo";

const MapaUbicacion = lazy(() => import("./mapa-ubicacion"));

function MapaCargando() {
  return <div aria-hidden="true" className="h-[300px] rounded-[3px] border border-publico-borde bg-publico-superficie md:h-[420px]" />;
}

export function Ubicacion() {
  const raiz = useRef<HTMLElement>(null);
  useAnimacion(raiz, animarSeccion);

  return (
    <section ref={raiz} id="ubicacion" aria-labelledby="titulo-ubicacion" className="border-t border-publico-borde">
      <div className={`${CONTENEDOR_PUBLICO} ${ESPACIO_DE_SECCION}`}>
        <h2 id="titulo-ubicacion" data-titulo="" className={TITULO_DE_SECCION}>
          <LineaDeTitulo>
            <span className={TEXTO_HUECO}>Dónde</span> estamos
          </LineaDeTitulo>
        </h2>
        <div className="mt-12 grid grid-cols-1 items-stretch gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12">
          <div data-aparece="" className="flex flex-col justify-between gap-7">
            <address className="not-italic">
              <span className={`${TITULAR} block text-[30px] leading-9 font-stretch-[110%]`}>
                {DIRECCION_DEL_CENTRO.calle} {DIRECCION_DEL_CENTRO.altura}
              </span>
              <span className="mt-1.5 block text-base text-publico-texto-tenue">{DIRECCION_DEL_CENTRO.localidad}</span>
              <span className="mt-6 block text-sm text-publico-texto-claro">{DIAS_DE_CLASE}</span>
            </address>
            <a
              href={ENLACE_COMO_LLEGAR}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BOTON_CONTORNO} h-[50px] self-stretch md:self-start`}
            >
              <MapPin aria-hidden="true" className="size-[18px]" />
              Cómo llegar
            </a>
          </div>
          <div data-aparece="">
            <Suspense fallback={<MapaCargando />}>
              <MapaUbicacion coordenadas={COORDENADAS_DEL_CENTRO} nombre={DIRECCION_COMPLETA} />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
