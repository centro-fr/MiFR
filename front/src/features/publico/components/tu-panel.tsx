import { CalendarDays, Dumbbell, TrendingUp, Trophy, type LucideIcon } from "lucide-react";
import { CelularDeMuestra } from "./celular-de-muestra";
import { CONTENEDOR_PUBLICO, TITULO_DE_SECCION, VOLANTA } from "./estilos-publicos";

const BENEFICIOS: { icono: LucideIcon; titulo: string; detalle: string }[] = [
  { icono: CalendarDays, titulo: "Tus clases", detalle: "Qué días te tocan y tu asistencia." },
  { icono: Dumbbell, titulo: "Tu rutina", detalle: "Ejercicios, series y repeticiones de cada día." },
  { icono: TrendingUp, titulo: "Tu progreso", detalle: "Peso y medidas, mes a mes." },
  { icono: Trophy, titulo: "Insignias y ranking", detalle: "Rachas, logros y el podio del mes." },
];

// Lo que el alumno encuentra en su panel una vez inscripto.
export function TuPanel() {
  return (
    <section id="app" aria-labelledby="titulo-app" className="bg-publico-niebla text-publico-tinta">
      <div className={`${CONTENEDOR_PUBLICO} grid grid-cols-1 items-center gap-16 py-16 md:grid-cols-2 md:py-28`}>
        <div>
          <p className={`${VOLANTA} text-primary-dark`}>Tu panel</p>
          <h2 id="titulo-app" className={TITULO_DE_SECCION}>
            Tu progreso,
            <br />
            en tu celu
          </h2>
          <p className="mb-8 mt-5 max-w-[460px] text-[17px] leading-[27px] text-publico-texto-gris">
            Cuando arrancás, entrás con tu cuenta de Google y tenés todo a mano.
          </p>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
            {BENEFICIOS.map(({ icono: Icono, titulo, detalle }) => (
              <li key={titulo} className="rounded-2xl border border-[#e1e4ea] bg-white p-[18px]">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-xl bg-[#fde7f2] text-primary-dark"
                >
                  <Icono className="size-5" />
                </span>
                <strong className="mt-3 block text-base">{titulo}</strong>
                <span className="mt-0.5 block text-sm leading-5 text-[#5b6475]">{detalle}</span>
              </li>
            ))}
          </ul>
        </div>
        <CelularDeMuestra />
      </div>
    </section>
  );
}
