import { useRef } from "react";
import { animarSeccion } from "@/features/publico/animaciones/animaciones-publicas";
import { useAnimacion } from "@/features/publico/animaciones/use-animacion";
import { ACTIVIDADES_DEL_CENTRO, type ActividadDelCentro } from "@/features/publico/utils/actividades-del-centro";
import { diasEnPalabras, diasResumidos } from "@/features/publico/utils/actividades";
import { CONTENEDOR_PUBLICO, ESPACIO_DE_SECCION, TEXTO_HUECO, TITULO_DE_SECCION } from "./estilos-publicos";
import { LineaDeTitulo } from "./linea-de-titulo";

const GRILLA = "m-0 grid list-none grid-cols-2 gap-x-6 p-0 md:grid-cols-5";

function ItemActividad({ actividad }: { actividad: ActividadDelCentro }) {
  return (
    <li data-aparece="" className="group pb-5">
      <span
        data-raya=""
        aria-hidden="true"
        className="mb-5 block h-px bg-publico-borde transition-colors duration-200 group-hover:bg-primary"
      />
      <h3 className="m-0 text-[17px] font-extrabold leading-6 transition-[color,translate] duration-200 group-hover:translate-x-1.5 group-hover:text-primary">
        {actividad.nombre}
      </h3>
      <p className="m-0 mt-1 text-[13px] leading-[18px] text-publico-texto-tenue">
        <span aria-hidden="true">{diasResumidos(actividad.dias)}</span>
        <span className="sr-only">Días: {diasEnPalabras(actividad.dias)}</span>
      </p>
    </li>
  );
}

// Las actividades del centro y los días en que se dan.
export function Actividades() {
  const raiz = useRef<HTMLElement>(null);
  useAnimacion(raiz, animarSeccion);

  return (
    <section ref={raiz} id="actividades" aria-labelledby="titulo-actividades">
      <div className={`${CONTENEDOR_PUBLICO} ${ESPACIO_DE_SECCION}`}>
        <h2 id="titulo-actividades" data-titulo="" className={`${TITULO_DE_SECCION} mb-12`}>
          <LineaDeTitulo>
            <span className={TEXTO_HUECO}>Encontrá tu</span>
          </LineaDeTitulo>
          <LineaDeTitulo>forma de entrenar</LineaDeTitulo>
        </h2>
        <ul className={GRILLA}>
          {ACTIVIDADES_DEL_CENTRO.map((actividad) => (
            <ItemActividad key={actividad.nombre} actividad={actividad} />
          ))}
        </ul>
      </div>
    </section>
  );
}
