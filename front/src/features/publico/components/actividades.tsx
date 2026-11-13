import { useRef } from "react";
import { animarSeccion } from "@/features/publico/animaciones/animaciones-publicas";
import { useAnimacion } from "@/features/publico/animaciones/use-animacion";
import { useActividadesPublicas } from "@/features/publico/hooks/use-actividades-publicas";
import type { ActividadPublica } from "@/features/publico/schemas/actividades";
import { diasEnPalabras, diasResumidos } from "@/features/publico/utils/actividades";
import { CONTENEDOR_PUBLICO, ESPACIO_DE_SECCION, TEXTO_HUECO, TITULO_DE_SECCION } from "./estilos-publicos";
import { LineaDeTitulo } from "./linea-de-titulo";

const GRILLA = "m-0 grid list-none grid-cols-2 gap-x-6 p-0 md:grid-cols-5";

function ItemActividad({ actividad }: { actividad: ActividadPublica }) {
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

function ItemsCargando() {
  return (
    <ul role="status" aria-label="Cargando las actividades" className={GRILLA}>
      {[1, 2, 3, 4, 5].map((indice) => (
        <li key={indice} className="pb-5">
          <span aria-hidden="true" className="mb-5 block h-px bg-publico-borde" />
          <span aria-hidden="true" className="block h-5 w-2/3 animate-pulse rounded-[3px] bg-publico-superficie" />
        </li>
      ))}
    </ul>
  );
}

// Las actividades con clases y los días en que se dan. Si la consulta falla o no hay actividades,
// la sección no aparece: la página sigue teniendo el resto.
export function Actividades() {
  const raiz = useRef<HTMLElement>(null);
  const { data, isPending, isError } = useActividadesPublicas();
  const actividades = data?.actividades ?? [];
  useAnimacion(raiz, animarSeccion, actividades.length > 0);

  if (isError || (!isPending && actividades.length === 0)) return null;

  return (
    <section ref={raiz} id="actividades" aria-labelledby="titulo-actividades">
      <div className={`${CONTENEDOR_PUBLICO} ${ESPACIO_DE_SECCION}`}>
        <h2 id="titulo-actividades" data-titulo="" className={`${TITULO_DE_SECCION} mb-12`}>
          <LineaDeTitulo>
            <span className={TEXTO_HUECO}>Encontrá tu</span>
          </LineaDeTitulo>
          <LineaDeTitulo>forma de entrenar</LineaDeTitulo>
        </h2>
        {isPending ? (
          <ItemsCargando />
        ) : (
          <ul className={GRILLA}>
            {actividades.map((actividad) => (
              <ItemActividad key={actividad.id_actividad} actividad={actividad} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
