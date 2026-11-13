import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import { llevaNumero, unaPorTipo, type InsigniaObtenida, type TipoInsignia } from "./insignias";

// Insignias de asistencia (US-31) con el diseño del canvas: cada tipo tiene su forma y su color, para
// que se distingan sin depender solo del color. Se usan en la ficha, el ranking y "Mis insignias".

interface Diseno {
  forma: ReactNode;
  icono: ReactNode;
  /** Dónde va el ícono dentro de la forma (cada forma tiene su centro visual). */
  desplazamiento: string;
  fondo: string;
  borde: string;
}

const DISENOS: Record<TipoInsignia, Diseno> = {
  // Calendario con tilde en un escudo verde.
  MES_PERFECTO: {
    forma: <path d="M18 1.5 L32.5 6.5 V17 C32.5 25.5 26 31.5 18 34.5 C10 31.5 3.5 25.5 3.5 17 V6.5 Z" />,
    icono: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
        <path d="m9 16 2 2 4-4" />
      </>
    ),
    desplazamiento: "translate(9.5 8.5) scale(0.7)",
    fondo: "#1f9d6b",
    borde: "#147350",
  },
  // Llama en un hexágono naranja.
  RACHA: {
    forma: <path d="M18 1.5 L32.5 9.75 V26.25 L18 34.5 L3.5 26.25 V9.75 Z" />,
    icono: (
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    ),
    desplazamiento: "translate(9.5 9.5) scale(0.7)",
    fondo: "#d65a12",
    borde: "#9a3f0b",
  },
  // Estrella en un círculo dorado.
  TOTAL_CLASES: {
    forma: <circle cx="18" cy="18" r="16.5" />,
    icono: (
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    ),
    desplazamiento: "translate(9.5 9.5) scale(0.7)",
    fondo: "#b7791f",
    borde: "#7a4b00",
  },
  // Trofeo en un pentágono rosa.
  PODIO_MES: {
    forma: <path d="M18 1.5 L34 13 L28 34 H8 L2 13 Z" />,
    icono: (
      <>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </>
    ),
    desplazamiento: "translate(9.5 11) scale(0.7)",
    fondo: "#d6337f",
    borde: "#8f0d4d",
  },
};

const BLOQUEADA = { fondo: "#e3e7ec", borde: "#c3c9d4", icono: "#8c95a6" };

interface PropsMedalla {
  tipo: TipoInsignia;
  /** Lado en px: 22 en tablas, 28 en encabezados, más grande en tarjetas. */
  tamano?: number;
  /** Todavía no obtenida: la misma forma en gris. */
  bloqueada?: boolean;
  /** En Racha y Clases va el número en lugar del ícono, para distinguir 10 de 25 o 50 de 100. */
  umbral?: number;
  className?: string;
}

/** Solo el dibujo: decorativo, quien la usa pone el nombre de la insignia al lado o en el tooltip. */
export function InsigniaMedalla({ tipo, tamano = 28, bloqueada = false, umbral, className }: PropsMedalla) {
  const diseno = DISENOS[tipo];
  const colores = bloqueada ? BLOQUEADA : { fondo: diseno.fondo, borde: diseno.borde, icono: "#ffffff" };
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 36 36"
      aria-hidden="true"
      className={cn("block shrink-0 overflow-visible drop-shadow-[0_1.5px_1.5px_rgba(24,28,38,0.28)]", className)}
    >
      <g fill={colores.fondo} stroke={colores.borde} strokeWidth="2.5" strokeLinejoin="round">
        {diseno.forma}
      </g>
      {umbral !== undefined && llevaNumero(tipo) ? (
        <text
          x="18"
          y="18.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill={colores.icono}
          fontSize={String(umbral).length > 2 ? 12.5 : 16}
          fontWeight="800"
          letterSpacing="-0.5"
        >
          {umbral}
        </text>
      ) : (
        <g
          transform={diseno.desplazamiento}
          fill="none"
          stroke={colores.icono}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {diseno.icono}
        </g>
      )}
    </svg>
  );
}

/**
 * Las insignias obtenidas en fila, una por tipo, con su nombre en un tooltip (con el mouse o el
 * teclado). Si no hay ninguna no muestra nada. El tooltip va en un portal: dentro de una tabla con
 * scroll no se recorta.
 */
export function ListaInsignias({
  insignias,
  tamano = 28,
  className,
}: {
  insignias: InsigniaObtenida[];
  tamano?: number;
  className?: string;
}) {
  const visibles = unaPorTipo(insignias);
  if (visibles.length === 0) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <ul aria-label="Insignias" className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {visibles.map((insignia) => {
          // Solo el nombre: la descripción larga ("Terminar entre los tres primeros…") sobra en un tooltip.
          const texto = insignia.nombre;
          return (
            <li key={insignia.codigo}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    aria-label={texto}
                    className="flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <InsigniaMedalla tipo={insignia.tipo} tamano={tamano} umbral={insignia.valor_umbral} />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-[#181c26] font-semibold text-white">{texto}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
}
