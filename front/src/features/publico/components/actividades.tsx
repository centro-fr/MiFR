import { useActividadesPublicas } from "@/features/publico/hooks/use-actividades-publicas";
import type { ActividadPublica } from "@/features/publico/schemas/actividades";
import { diasEnPalabras, semanaDeLaActividad } from "@/features/publico/utils/actividades";
import { cn } from "@/utils/cn";
import { CONTENEDOR_PUBLICO, TITULO_DE_SECCION, VOLANTA } from "./estilos-publicos";

// Hasta 1024 px la fila se reacomoda: el número a la izquierda, el nombre y la descripción a lo ancho, y
// abajo los días junto a las clases por semana. Con menos ancho, las cinco columnas pisan los nombres largos.
const GRILLA_DE_FILA =
  "grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2.5 lg:grid-cols-[56px_minmax(0,1.25fr)_minmax(0,1.2fr)_auto_104px] lg:gap-x-6 lg:gap-y-0";

function DiasDeLaActividad({ dias }: { dias: number[] }) {
  return (
    <span className="col-start-2 flex gap-1 lg:col-start-auto">
      <span className="sr-only">Días: {diasEnPalabras(dias)}</span>
      {semanaDeLaActividad(dias).map(({ dia, inicial, conClase }) => (
        <span
          key={dia}
          aria-hidden="true"
          className={cn(
            "flex size-7 items-center justify-center rounded-lg text-xs font-extrabold",
            conClase ? "bg-primary text-white" : "text-[#b4bac6]",
          )}
        >
          {inicial}
        </span>
      ))}
    </span>
  );
}

function FilaActividad({ actividad, numero }: { actividad: ActividadPublica; numero: number }) {
  const { nombre, descripcion, dias, clases_por_semana: clases } = actividad;

  return (
    <li
      className={cn(
        GRILLA_DE_FILA,
        "group border-b border-publico-borde py-5 transition-colors duration-200 hover:bg-publico-tinta hover:text-white lg:px-4 lg:py-[22px]",
      )}
    >
      <span
        aria-hidden="true"
        className="self-start pt-1 font-display text-lg text-[#6b7385] group-hover:text-primary lg:self-center lg:pt-0 lg:text-[22px]"
      >
        {String(numero).padStart(2, "0")}
      </span>
      <h3 className="col-span-2 m-0 font-display text-[30px] font-normal uppercase leading-8 wrap-break-word hyphens-auto lg:col-span-1 lg:text-[32px] lg:leading-[34px] xl:text-[40px] xl:leading-[42px]">
        {nombre}
      </h3>
      <p
        className={cn(
          "col-span-2 col-start-2 m-0 text-[15px] leading-[22px] text-publico-texto-gris group-hover:text-publico-texto-tenue lg:col-span-1 lg:col-start-auto",
          !descripcion && "hidden lg:block",
        )}
      >
        {descripcion}
      </p>
      <DiasDeLaActividad dias={dias} />
      <p className="m-0 text-right text-xs leading-[14px] text-publico-texto-gris group-hover:text-publico-texto-tenue lg:text-sm lg:leading-6">
        <strong className="block font-display text-[22px] font-normal leading-6 text-publico-tinta group-hover:text-white lg:text-[28px] lg:leading-[30px]">
          {clases}
        </strong>{" "}
        <span className="sr-only">{clases === 1 ? "clase" : "clases"} </span>por semana
      </p>
    </li>
  );
}

function FilasCargando() {
  return (
    <div role="status" aria-label="Cargando las actividades" className="border-t-2 border-publico-tinta">
      {[1, 2, 3, 4].map((indice) => (
        <div key={indice} className="border-b border-publico-borde py-6">
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-[#e1e4ea] md:w-1/3" />
        </div>
      ))}
    </div>
  );
}

// Una fila por actividad con clases, con su descripción y los días en que se da. Si la consulta
// falla o no hay actividades, la sección no aparece: la home sigue teniendo el resto.
export function Actividades() {
  const { data, isPending, isError } = useActividadesPublicas();
  if (isError) return null;
  const actividades = data?.actividades ?? [];
  if (!isPending && actividades.length === 0) return null;

  return (
    <section id="actividades" aria-labelledby="titulo-actividades" className="bg-publico-niebla text-publico-tinta">
      <div className={`${CONTENEDOR_PUBLICO} py-16 md:py-28`}>
        <p className={`${VOLANTA} text-primary-dark`}>Actividades</p>
        <h2 id="titulo-actividades" className={`${TITULO_DE_SECCION} mb-9`}>
          Encontrá tu forma
          <br />
          de entrenar
        </h2>
        {isPending ? (
          <FilasCargando />
        ) : (
          <ol className="m-0 list-none border-t-2 border-publico-tinta p-0">
            {actividades.map((actividad, indice) => (
              <FilaActividad key={actividad.id_actividad} actividad={actividad} numero={indice + 1} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
