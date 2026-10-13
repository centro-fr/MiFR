import { Fragment } from "react";
import { useActividadesPublicas } from "@/features/publico/hooks/use-actividades-publicas";

// La franja rosa que separa la portada de las actividades, con sus nombres. Es decorativa (las
// actividades se leen en la sección siguiente): los lectores de pantalla la saltean.
// La lista va dos veces para que el desplazamiento no tenga cortes; con movimiento reducido queda quieta.
export function FranjaActividades() {
  const { data } = useActividadesPublicas();
  const nombres = data?.actividades.map(({ nombre }) => nombre) ?? [];
  if (nombres.length === 0) return null;

  const tira = (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {nombres.map((nombre) => (
        <Fragment key={nombre}>
          <span className="whitespace-nowrap text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            {nombre}
          </span>
          <span className="text-xl text-white/60">✦</span>
        </Fragment>
      ))}
    </div>
  );

  // Inclinada 2°, cada punta sube o baja un 1,75 % del ancho de la pantalla: el margen vertical crece con
  // el ancho para que el recorte del contenedor no la corte en escalón.
  return (
    <div aria-hidden="true" className="overflow-hidden py-[max(1.25rem,2.5vw)]">
      {/* Más ancha que la pantalla, para que la inclinación no deje los extremos al aire. */}
      <div className="-mx-12 -rotate-2 bg-primary py-4">
        <div className="flex w-max animate-marquesina">
          {tira}
          {tira}
        </div>
      </div>
    </div>
  );
}
