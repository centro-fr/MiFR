import { useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  MES_CORTO,
  cantidadDeAltas,
  describirComparacion,
  esMesEnCurso,
  esMesFuturo,
} from "@/features/reportes/utils/formato-inscripciones";
import { useAncho } from "@/hooks/use-ancho";
import type { AltasDelMes } from "@/types/reportes";

// Barras de altas por mes (US-35). SVG propio, como el gráfico de peso de US-27: una sola serie no
// justifica sumar una librería. La tabla de abajo tiene los mismos números y hace de vista de tabla.

const ALTO = 200;
const MARGEN = { arriba: 22, abajo: 26 } as const;
const ANCHO_MAXIMO_BARRA = 24;
const RADIO = 4;
const ALTO_DEL_GLOBO = 64;

/** Barra con la punta redondeada y la base recta, apoyada en la línea de base. */
function trazoDeBarra(x: number, ancho: number, arriba: number, base: number): string {
  const radio = Math.min(RADIO, base - arriba, ancho / 2);
  return [
    `M${x},${base}`,
    `L${x},${arriba + radio}`,
    `Q${x},${arriba} ${x + radio},${arriba}`,
    `L${x + ancho - radio},${arriba}`,
    `Q${x + ancho},${arriba} ${x + ancho},${arriba + radio}`,
    `L${x + ancho},${base}`,
    "Z",
  ].join(" ");
}

interface PropsGrafico {
  meses: AltasDelMes[];
  /** AAAA-MM-DD: los meses que todavía no empezaron van sin barra. */
  hoy: string;
}

export function GraficoAltasPorMes({ meses, hoy }: PropsGrafico) {
  const [contenedor, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);

  const transcurridos = meses.filter((mes) => !esMesFuturo(mes, hoy));
  const maximo = Math.max(1, ...transcurridos.map((mes) => mes.cantidad));
  const base = ALTO - MARGEN.abajo;
  const altoUtil = base - MARGEN.arriba;
  const espacio = ancho / Math.max(meses.length, 1);
  const anchoBarra = Math.min(ANCHO_MAXIMO_BARRA, espacio * 0.55);
  const centro = (indice: number) => espacio * indice + espacio / 2;
  const arriba = (cantidad: number) => base - (cantidad / maximo) * altoUtil;
  const ultimoTranscurrido = transcurridos.length - 1;

  // El globo se engancha al mes más cercano: toda la columna es zona de toque, no solo la barra.
  function seguirPuntero(evento: PointerEvent<SVGSVGElement>) {
    const posicion = evento.clientX - evento.currentTarget.getBoundingClientRect().left;
    const indice = Math.min(Math.max(Math.floor(posicion / espacio), 0), meses.length - 1);
    setActivo(esMesFuturo(meses[indice], hoy) ? null : indice);
  }

  function moverConTeclado(evento: KeyboardEvent<SVGSVGElement>) {
    if (ultimoTranscurrido < 0) return;
    const actual = activo ?? ultimoTranscurrido;
    const siguiente: Record<string, number> = {
      ArrowLeft: Math.max(actual - 1, 0),
      ArrowRight: Math.min(actual + 1, ultimoTranscurrido),
      Home: 0,
      End: ultimoTranscurrido,
    };
    if (!(evento.key in siguiente)) return;
    evento.preventDefault();
    setActivo(siguiente[evento.key]);
  }

  const resaltado = activo === null ? null : meses[activo];
  const pico = transcurridos.reduce<AltasDelMes | null>((mejor, mes) => (!mejor || mes.cantidad > mejor.cantidad ? mes : mejor), null);
  const descripcion = pico
    ? `Altas por mes. El mes con más altas fue ${pico.nombre} con ${pico.cantidad}. El detalle de cada mes está en la tabla.`
    : "Altas por mes: no hubo altas en el período.";

  return (
    <div ref={contenedor} className="relative w-full" style={{ height: ALTO }}>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={ALTO}
          role="img"
          aria-label={descripcion}
          tabIndex={0}
          onPointerMove={seguirPuntero}
          onPointerLeave={() => setActivo(null)}
          onFocus={() => setActivo(ultimoTranscurrido >= 0 ? ultimoTranscurrido : null)}
          onBlur={() => setActivo(null)}
          onKeyDown={moverConTeclado}
          className="touch-pan-y rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {meses.map((mes, indice) =>
            esMesEnCurso(mes, hoy) ? (
              <rect key="en-curso" x={espacio * indice + 2} y={4} width={espacio - 4} height={ALTO - 6} rx={8} className="fill-pink-50 dark:fill-primary/10" />
            ) : null,
          )}
          <line x1={0} x2={ancho} y1={base} y2={base} strokeWidth={1} className="stroke-slate-200 dark:stroke-slate-700" />
          {meses.map((mes, indice) => {
            const futuro = esMesFuturo(mes, hoy);
            const x = centro(indice);
            return (
              <g key={`${mes.anio}-${mes.mes}`}>
                {!futuro && mes.cantidad > 0 && (
                  <path
                    d={trazoDeBarra(x - anchoBarra / 2, anchoBarra, arriba(mes.cantidad), base)}
                    className={indice === activo ? "fill-primary-dark" : "fill-primary"}
                  />
                )}
                {!futuro && (
                  <text x={x} y={arriba(mes.cantidad) - 6} textAnchor="middle" className="fill-slate-700 text-[11px] font-bold tabular-nums dark:fill-slate-200">
                    {mes.cantidad}
                  </text>
                )}
                <text
                  x={x}
                  y={ALTO - 8}
                  textAnchor="middle"
                  className={
                    esMesEnCurso(mes, hoy)
                      ? "fill-slate-900 text-[11px] font-extrabold dark:fill-white"
                      : futuro
                        ? "fill-slate-300 text-[11px] dark:fill-slate-600"
                        : "fill-slate-500 text-[11px] dark:fill-slate-400"
                  }
                >
                  {MES_CORTO[mes.mes - 1]}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {resaltado && activo !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-center shadow-md dark:bg-slate-800"
          style={{
            left: Math.min(Math.max(centro(activo), 64), ancho - 64),
            top: Math.max(arriba(resaltado.cantidad) - ALTO_DEL_GLOBO - 4, 0),
          }}
        >
          <p className="text-sm font-extrabold whitespace-nowrap text-slate-900 dark:text-white">{cantidadDeAltas(resaltado.cantidad)}</p>
          <p className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
            {resaltado.nombre} {resaltado.anio}
          </p>
          {resaltado.diferencia !== null && (
            <p className="text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">{describirComparacion(resaltado)} vs. mes anterior</p>
          )}
        </div>
      )}
    </div>
  );
}
