import { createElement } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActividadesPublicas } from "@/features/publico/hooks/use-actividades-publicas";
import type { ActividadPublica } from "@/features/publico/schemas/actividades";
import { diasAbreviados, iconoDeActividad } from "@/features/publico/utils/actividades";

function TarjetaActividad({ actividad }: { actividad: ActividadPublica }) {
  return (
    <li className="group flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white"
      >
        {createElement(iconoDeActividad(actividad.nombre), { className: "size-6" })}
      </span>
      <div>
        <h3 className="text-lg font-black text-foreground">{actividad.nombre}</h3>
        {actividad.descripcion && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{actividad.descripcion}</p>
        )}
      </div>
      <p className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
        <span className="font-bold text-foreground">{diasAbreviados(actividad.dias)}</span>
        <span className="text-muted-foreground">
          {actividad.clases_por_semana} {actividad.clases_por_semana === 1 ? "clase" : "clases"} por semana
        </span>
      </p>
    </li>
  );
}

// Una tarjeta por actividad con clases, con su descripción y los días en que se da. Si la consulta
// falla o no hay actividades, la sección no aparece: la home sigue teniendo la portada y el contacto.
export function Actividades() {
  const { data, isPending, isError } = useActividadesPublicas();
  if (isError) return null;
  const actividades = data?.actividades ?? [];
  if (!isPending && actividades.length === 0) return null;

  return (
    <section id="actividades" aria-labelledby="titulo-actividades" className="scroll-mt-20 pb-16 pt-12 lg:pb-20">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-extrabold uppercase tracking-widest text-primary">Actividades</p>
          <h2 id="titulo-actividades" className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Encontrá tu forma de entrenar
          </h2>
        </div>
        {isPending ? (
          <div role="status" aria-label="Cargando las actividades" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((indice) => (
              <Skeleton key={indice} className="h-48 rounded-3xl" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {actividades.map((actividad) => (
              <TarjetaActividad key={actividad.id_actividad} actividad={actividad} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
