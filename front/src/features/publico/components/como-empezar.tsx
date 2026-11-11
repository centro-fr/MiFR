import { cn } from "@/utils/cn";
import { CONTENEDOR_PUBLICO, TITULO_DE_SECCION, VOLANTA } from "./estilos-publicos";

const PASOS = [
  {
    titulo: "Escribinos",
    detalle: "Por WhatsApp te contamos los planes, los precios y qué horarios tienen lugar.",
  },
  {
    titulo: "Reservá tu lugar",
    detalle: "Elegís actividad y horario, y la profe te anota con tus datos.",
  },
  {
    titulo: "Pagá y arrancá",
    detalle: "Con el primer pago quedás inscripto y entrás a tu panel con Google.",
  },
];

// El último paso va en rosa: es la meta del recorrido.
function Paso({ numero, titulo, detalle, destacado }: { numero: number; titulo: string; detalle: string; destacado: boolean }) {
  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-white/12 p-7",
        destacado ? "bg-primary" : "bg-publico-tinta-suave",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-[18px] top-1 font-display text-[120px] leading-[120px]",
          destacado ? "text-white/22" : "text-primary/35",
        )}
      >
        {String(numero).padStart(2, "0")}
      </span>
      <h3 className="relative mb-2 mt-[72px] text-[22px] font-extrabold leading-7">{titulo}</h3>
      <p className={cn("relative m-0 text-[15px] leading-[23px]", destacado ? "text-[#ffe3f1]" : "text-publico-texto-tenue")}>
        {detalle}
      </p>
    </li>
  );
}

export function ComoEmpezar() {
  return (
    <section id="empezar" aria-labelledby="titulo-empezar" className="bg-publico-tinta">
      <div className={`${CONTENEDOR_PUBLICO} py-16 md:py-28`}>
        <p className={`${VOLANTA} text-[#ff6fb5]`}>Cómo empezar</p>
        <h2 id="titulo-empezar" className={`${TITULO_DE_SECCION} mb-12`}>
          Tres pasos y
          <br />
          estás entrenando
        </h2>
        <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
          {PASOS.map((paso, indice) => (
            <Paso key={paso.titulo} numero={indice + 1} destacado={indice === PASOS.length - 1} {...paso} />
          ))}
        </ol>
      </div>
    </section>
  );
}
