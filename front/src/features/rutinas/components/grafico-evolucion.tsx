import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { useAncho } from "@/hooks/use-ancho";
import { formatearMedida, type PuntoDeEvolucion } from "@/features/rutinas/utils/formato-rutinas";

// Línea de una sola medida en el tiempo (US-27). SVG propio: un gráfico de una serie no justifica sumar
// una librería. Los mismos valores están en el historial de mediciones, que hace de vista de tabla.

const ALTO = 168;
const MARGEN = { arriba: 12, derecha: 64, abajo: 24, izquierda: 36 } as const;
// Aire entre el eje y el primer punto, para que no quede pegado a las etiquetas.
const RELLENO_X = 10;
const ALTO_DEL_GLOBO = 56;
const FORMATO_MARCA = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function pasoRedondo(rango: number): number {
  const potencia = 10 ** Math.floor(Math.log10(rango));
  const relativo = rango / potencia;
  return (relativo <= 1 ? 1 : relativo <= 2 ? 2 : relativo <= 5 ? 5 : 10) * potencia;
}

/** Eje Y con números redondos que contienen todos los valores (2 a 4 marcas). */
function escalaY(valores: number[]): { minimo: number; maximo: number; marcas: number[] } {
  const [menor, mayor] = [Math.min(...valores), Math.max(...valores)];
  const paso = pasoRedondo(mayor - menor || Math.max(Math.abs(mayor) * 0.05, 1));
  const minimo = Math.floor(menor / paso) * paso;
  const maximo = Math.max(Math.ceil(mayor / paso) * paso, minimo + paso);
  const marcas = Array.from({ length: Math.round((maximo - minimo) / paso) + 1 }, (_, indice) => minimo + indice * paso);
  return { minimo, maximo, marcas };
}

const instante = (dia: string) => Date.parse(`${dia}T00:00:00Z`);

interface PropsGrafico {
  /** Del más antiguo al más reciente; al menos dos. */
  puntos: PuntoDeEvolucion[];
  etiqueta: string;
  unidad: string;
}

export function GraficoEvolucion({ puntos, etiqueta, unidad }: PropsGrafico) {
  const [contenedor, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);

  const { minimo, maximo, marcas } = escalaY(puntos.map((punto) => punto.valor));
  const [primero, ultimo] = [instante(puntos[0].fecha), instante(puntos[puntos.length - 1].fecha)];
  const anchoUtil = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha - RELLENO_X, 1);
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = (dia: string) => MARGEN.izquierda + RELLENO_X + ((instante(dia) - primero) / (ultimo - primero || 1)) * anchoUtil;
  const y = (valor: number) => MARGEN.arriba + (1 - (valor - minimo) / (maximo - minimo)) * altoUtil;
  const coordenadas = puntos.map((punto) => ({ ...punto, cx: x(punto.fecha), cy: y(punto.valor) }));
  const linea = coordenadas.map(({ cx, cy }, indice) => `${indice === 0 ? "M" : "L"}${cx},${cy}`).join(" ");
  const final = coordenadas[coordenadas.length - 1];
  const resaltado = activo === null ? null : coordenadas[activo];

  // La cruz sigue al puntero y se engancha a la fecha más cercana: nadie apunta a una línea de 2 px.
  function seguirPuntero(evento: PointerEvent<SVGSVGElement>) {
    const posicion = evento.clientX - evento.currentTarget.getBoundingClientRect().left;
    const masCercano = coordenadas.reduce(
      (mejor, { cx }, indice) => (Math.abs(cx - posicion) < Math.abs(coordenadas[mejor].cx - posicion) ? indice : mejor),
      0,
    );
    setActivo(masCercano);
  }

  function moverConTeclado(evento: KeyboardEvent<SVGSVGElement>) {
    const ultimoIndice = coordenadas.length - 1;
    const actual = activo ?? ultimoIndice;
    const siguiente: Record<string, number> = {
      ArrowLeft: Math.max(actual - 1, 0),
      ArrowRight: Math.min(actual + 1, ultimoIndice),
      Home: 0,
      End: ultimoIndice,
    };
    if (!(evento.key in siguiente)) return;
    evento.preventDefault();
    setActivo(siguiente[evento.key]);
  }

  const descripcion = `${etiqueta}: de ${formatearMedida(puntos[0].valor, unidad)} el ${formatearFecha(puntos[0].fecha)} a ${formatearMedida(final.valor, unidad)} el ${formatearFecha(final.fecha)}.`;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{descripcion} El detalle de cada medición está en el historial.</figcaption>
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
            onFocus={() => setActivo(coordenadas.length - 1)}
            onBlur={() => setActivo(null)}
            onKeyDown={moverConTeclado}
            className="touch-pan-y rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {marcas.map((marca) => (
              <g key={marca}>
                <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(marca)} y2={y(marca)} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={1} />
                <text x={MARGEN.izquierda - 6} y={y(marca)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">
                  {FORMATO_MARCA.format(marca)}
                </text>
              </g>
            ))}
            {[coordenadas[0], final].map(({ fecha, cx }, indice) => (
              <text key={fecha} x={cx} y={ALTO - 6} textAnchor={indice === 0 ? "start" : "end"} className="fill-slate-500 text-[11px] dark:fill-slate-400">
                {formatearFecha(fecha)}
              </text>
            ))}
            {resaltado && (
              <line x1={resaltado.cx} x2={resaltado.cx} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} className="stroke-slate-400 dark:stroke-slate-500" strokeWidth={1} />
            )}
            <path d={linea} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-primary" />
            {coordenadas.map(({ fecha, cx, cy }, indice) => (
              <circle key={fecha + indice} cx={cx} cy={cy} r={indice === activo ? 5 : 4} strokeWidth={2} className="fill-primary stroke-white dark:stroke-slate-900" />
            ))}
            <text x={final.cx + 10} y={final.cy} dominantBaseline="middle" className="fill-slate-900 text-xs font-bold dark:fill-white">
              {formatearMedida(final.valor, unidad)}
            </text>
          </svg>
        )}
        {resaltado && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-center shadow-md dark:bg-slate-800"
            // Arriba del punto; si no entra, abajo, para no tapar el punto que describe.
            style={{
              left: Math.min(Math.max(resaltado.cx, 48), ancho - 48),
              top: resaltado.cy > ALTO_DEL_GLOBO ? resaltado.cy - ALTO_DEL_GLOBO : resaltado.cy + 12,
            }}
          >
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{formatearMedida(resaltado.valor, unidad)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatearFecha(resaltado.fecha)}</p>
          </div>
        )}
      </div>
    </figure>
  );
}
